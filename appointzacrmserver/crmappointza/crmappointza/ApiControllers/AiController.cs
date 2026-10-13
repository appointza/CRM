using System.Text;
using CrmAppointza.AiModel;
using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class AiController : ControllerBase
    {
        const string DefaultSystemPrompt =
            "You are a sales and business assistant for a CRM. Use only the facts provided. " +
            "If information is missing, say it is unknown instead of guessing. Be concise and practical.";

        readonly ILogger<AiController> logger;
        readonly OllamaClient ollama;
        readonly BusinessProfileStore profiles;

        public AiController(ILogger<AiController> logger, OllamaClient ollama, BusinessProfileStore profiles)
        {
            this.logger = logger;
            this.ollama = ollama;
            this.profiles = profiles;
        }

        string OrgId() => Request.Headers["X-Organization-Id"].FirstOrDefault() ?? "default";

        [HttpGet("BusinessProfile")]
        public async Task<ActionResult<ActionRes<BusinessProfile>>> GetBusinessProfile()
        {
            return Ok(new ActionRes<BusinessProfile> { item = await profiles.Get(OrgId()) });
        }

        [HttpPost("BusinessProfile")]
        public async Task<ActionResult<ActionRes<BusinessProfile>>> SaveBusinessProfile(ActionReq<BusinessProfile> req)
        {
            if (req?.item == null) return BadRequest(new { message = "profile is required" });
            return Ok(new ActionRes<BusinessProfile> { item = await profiles.Save(OrgId(), req.item) });
        }

        [HttpGet("Health")]
        public async Task<ActionResult<ActionRes<AiHealthRes>>> Health()
        {
            return Ok(new ActionRes<AiHealthRes> { item = await ollama.Health() });
        }

        [HttpPost("Chat")]
        public async Task<ActionResult<ActionRes<AiChatRes>>> Chat(ActionReq<AiChatReq> req)
        {
            var r = req.item;
            if (r == null || string.IsNullOrWhiteSpace(r.prompt))
                return BadRequest(new { message = "prompt is required" });

            var prompt = new StringBuilder();
            var business = BusinessProfileStore.ToPromptContext(await profiles.Get(OrgId()));
            if (!string.IsNullOrWhiteSpace(business))
            {
                prompt.AppendLine("Our business (the seller). Quote prices and packages only from this data:");
                prompt.AppendLine(business);
                prompt.AppendLine();
            }
            if (r.lead != null)
            {
                prompt.AppendLine("Lead details (verified CRM data):");
                prompt.AppendLine(LeadContext(r.lead));
                prompt.AppendLine();
            }
            prompt.Append(r.prompt);

            try
            {
                var res = await ollama.Chat(prompt.ToString(),
                    string.IsNullOrWhiteSpace(r.systemPrompt) ? DefaultSystemPrompt : r.systemPrompt, r.model);
                return Ok(new ActionRes<AiChatRes> { item = res });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "AI chat failed");
                return StatusCode(503, new { message = "Local AI model failed: " + ex.Message });
            }
        }

        static string LeadContext(Lead l)
        {
            var sb = new StringBuilder();
            void Add(string label, string v) { if (!string.IsNullOrWhiteSpace(v)) sb.AppendLine($"- {label}: {v}"); }
            Add("Name", l.name); Add("Business", l.businessname); Add("Owner", l.ownername);
            Add("Category", l.category); Add("Website", l.website); Add("Phone", l.phone);
            Add("Email", l.email); Add("Address", l.address); Add("City", l.city);
            Add("State", l.state); Add("Type", l.type); Add("Tags", l.tags); Add("Notes", l.notes);
            Add("Source", l.source);
            return sb.ToString();
        }
    }
}
