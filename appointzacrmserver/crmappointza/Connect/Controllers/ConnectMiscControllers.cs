using System.Text.Json;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using CrmAppointza.Utils;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Connect.Controllers
{
    [ApiController]
    [Route("dashboard")]
    public class ConnectDashboardController : ConnectControllerBase
    {
        readonly ConnectAppService appService;
        public ConnectDashboardController(ConnectAppService appService) => this.appService = appService;

        [HttpGet("stats")]
        public Task<object> Stats() => appService.DashboardStats(RequireUser(), HeaderOrgId());
    }

    [ApiController]
    [Route("billing")]
    public class ConnectBillingController : ConnectControllerBase
    {
        readonly ConnectAppService appService;
        public ConnectBillingController(ConnectAppService appService) => this.appService = appService;

        [HttpGet]
        public Task<object> Get() => appService.Billing(RequireUser(), HeaderOrgId());

        [HttpPost("top-up")]
        public async Task<object> TopUp([FromBody] JsonElement body)
        {
            var amount = body.TryGetProperty("amount", out var a) && a.TryGetDecimal(out var d) ? d : 0;
            return await appService.TopUp(RequireUser(), HeaderOrgId(), amount);
        }
    }

    [ApiController]
    [Route("users")]
    public class ConnectUsersController : ConnectControllerBase
    {
        readonly ConnectAppService appService;
        readonly UserService userService;
        public ConnectUsersController(ConnectAppService appService, UserService userService)
        {
            this.appService = appService;
            this.userService = userService;
        }

        [HttpGet]
        public Task<List<object>> List() => appService.ListUsers(RequireUser(), HeaderOrgId());

        [HttpPost]
        public async Task<object> Create([FromBody] JsonElement body)
        {
            var user = RequireUser();
            var orgId = ConnectTenant.ResolveOrganizationId(user, HeaderOrgId());
            var row = new User
            {
                organizationid = orgId,
                name = body.GetProperty("name").GetString(),
                email = body.GetProperty("email").GetString()?.ToLowerInvariant(),
                role = body.TryGetProperty("role", out var r) ? r.GetString() : "agent",
                passwordhash = BCrypt.Net.BCrypt.HashPassword(body.GetProperty("password").GetString() ?? "", 10),
            };
            await userService.Insert(row);
            return ConnectJsonMapper.User(row);
        }

        [HttpPatch("{id}")]
        public async Task<object> Patch(string id, [FromBody] JsonElement body)
        {
            RequireUser();
            var rows = await userService.Select(new UserSelectReq { id = id });
            var row = rows.FirstOrDefault() ?? throw new AppException(AppException.ErrorCodes.UserNotFound, "User not found");
            if (body.TryGetProperty("name", out var n)) row.name = n.GetString();
            if (body.TryGetProperty("role", out var r)) row.role = r.GetString();
            if (body.TryGetProperty("password", out var p) && p.ValueKind == JsonValueKind.String)
                row.passwordhash = BCrypt.Net.BCrypt.HashPassword(p.GetString() ?? "", 10);
            await userService.Update(row);
            return ConnectJsonMapper.User(row);
        }
    }

    [ApiController]
    [Route("templates")]
    public class ConnectTemplatesController : ConnectControllerBase
    {
        readonly ConnectAppService appService;
        readonly TemplateService templateService;
        public ConnectTemplatesController(ConnectAppService appService, TemplateService templateService)
        {
            this.appService = appService;
            this.templateService = templateService;
        }

        [HttpGet]
        public Task<List<object>> List() => appService.ListTemplates(RequireUser(), HeaderOrgId());

        [HttpPost]
        public async Task<object> Create([FromBody] JsonElement body)
        {
            var orgId = ConnectTenant.ResolveOrganizationId(RequireUser(), HeaderOrgId());
            var row = new Template
            {
                organizationid = orgId,
                channel = body.GetProperty("channel").GetString(),
                name = body.GetProperty("name").GetString(),
                body = body.GetProperty("body").GetString(),
            };
            await templateService.Insert(row);
            return ConnectJsonMapper.Template(row);
        }

        [HttpPost("sync-whatsapp")]
        public Task<object> SyncWhatsApp() => Task.FromResult<object>(new { ok = true, synced = 0 });

        [HttpPost("whatsapp")]
        public Task<object> CreateWhatsApp([FromBody] JsonElement _) =>
            Task.FromResult<object>(new { ok = true });
    }

    [ApiController]
    [Route("campaigns")]
    public class ConnectCampaignsController : ConnectControllerBase
    {
        readonly ConnectAppService appService;
        readonly CampaignService campaignService;
        public ConnectCampaignsController(ConnectAppService appService, CampaignService campaignService)
        {
            this.appService = appService;
            this.campaignService = campaignService;
        }

        [HttpGet]
        public Task<List<object>> List() => appService.ListCampaigns(RequireUser(), HeaderOrgId());

        [HttpGet("{id}")]
        public async Task<object> Get(string id)
        {
            var rows = await campaignService.Select(new CampaignSelectReq { id = id });
            var row = rows.FirstOrDefault() ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Campaign not found");
            return ConnectJsonMapper.Campaign(row);
        }

        [HttpPost]
        public async Task<object> Create([FromBody] JsonElement body)
        {
            var orgId = ConnectTenant.ResolveOrganizationId(RequireUser(), HeaderOrgId());
            var row = new Campaign
            {
                organizationid = orgId,
                name = body.GetProperty("name").GetString(),
                channel = body.GetProperty("channel").GetString(),
                templateid = body.GetProperty("templateId").GetString(),
                leadids = body.TryGetProperty("leadIds", out var lids) ? lids.GetRawText() : "[]",
                status = "draft",
                sent = 0,
                delivered = 0,
                failed = 0,
                createdat = DateTime.UtcNow,
            };
            await campaignService.Insert(row);
            return ConnectJsonMapper.Campaign(row);
        }

        [HttpPost("{id}/send")]
        public async Task<object> Send(string id)
        {
            var rows = await campaignService.Select(new CampaignSelectReq { id = id });
            var row = rows.FirstOrDefault() ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Campaign not found");
            row.status = "sent";
            row.sent = (row.sent ?? 0) + 1;
            await campaignService.Update(row);
            return ConnectJsonMapper.Campaign(row);
        }
    }

    [ApiController]
    [Route("tenants")]
    public class ConnectTenantsController : ConnectControllerBase
    {
        readonly ConnectAppService appService;
        readonly OrganizationService organizationService;
        public ConnectTenantsController(ConnectAppService appService, OrganizationService organizationService)
        {
            this.appService = appService;
            this.organizationService = organizationService;
        }

        [HttpGet]
        public Task<List<object>> List()
        {
            var user = RequireUser();
            if (user.Role != ConnectTenant.SuperAdminRole)
                throw new AppException(AppException.ErrorCodes.Forbidden, "Super admin only");
            return appService.Tenants();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var user = RequireUser();
            if (user.Role != ConnectTenant.SuperAdminRole)
                throw new AppException(AppException.ErrorCodes.Forbidden, "Super admin only");
            await organizationService.Delete(new OrganizationDeleteReq { id = id });
            return NoContent();
        }
    }

    [ApiController]
    public class ConnectAppInfoController : ControllerBase
    {
        [HttpGet("api-info")]
        public object ApiInfo() => new { name = "Appointza Connect CRM", version = "1.0.0", backend = "crmappointza" };

        [HttpGet("health")]
        public object Health() => new { status = "ok" };
    }

    [ApiController]
    [Route("webhooks")]
    public class ConnectWebhooksController : ControllerBase
    {
        readonly ChannelConfigurationService channelConfigurationService;
        readonly ConnectWhatsAppWebhookService whatsAppWebhookService;

        public ConnectWebhooksController(
            ChannelConfigurationService channelConfigurationService,
            ConnectWhatsAppWebhookService whatsAppWebhookService)
        {
            this.channelConfigurationService = channelConfigurationService;
            this.whatsAppWebhookService = whatsAppWebhookService;
        }

        [HttpGet("whatsapp")]
        public async Task<IActionResult> WhatsAppVerify([FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.verify_token")] string? token,
            [FromQuery(Name = "hub.challenge")] string? challenge)
        {
            if (mode == "subscribe" &&
                await ConnectChannelConfigHelper.MatchesAnyVerifyToken(channelConfigurationService, token, whatsApp: true))
                return Content(challenge ?? "", "text/plain");
            return Unauthorized();
        }

        [HttpPost("whatsapp")]
        public async Task<IActionResult> WhatsAppPost()
        {
            Request.EnableBuffering();
            using var ms = new MemoryStream();
            await Request.Body.CopyToAsync(ms);
            var raw = ms.ToArray();
            Request.Body.Position = 0;

            var signature = Request.Headers["X-Hub-Signature-256"].FirstOrDefault();
            if (!await whatsAppWebhookService.VerifySignatureAsync(raw, signature))
                return Unauthorized();

            JsonElement body;
            try
            {
                body = JsonSerializer.Deserialize<JsonElement>(raw);
            }
            catch
            {
                return BadRequest();
            }

            await whatsAppWebhookService.HandlePayloadAsync(body);
            return Ok(new { ok = true });
        }

        [HttpGet("facebook")]
        public async Task<IActionResult> FacebookVerify([FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.verify_token")] string? token,
            [FromQuery(Name = "hub.challenge")] string? challenge)
        {
            if (mode == "subscribe" &&
                await ConnectChannelConfigHelper.MatchesAnyVerifyToken(channelConfigurationService, token, whatsApp: false))
                return Content(challenge ?? "", "text/plain");
            return Unauthorized();
        }

        [HttpPost("facebook")]
        public IActionResult FacebookPost() => Ok(new { ok = true });
    }

    [ApiController]
    [Route("whatsapp")]
    public class ConnectWhatsAppController : ConnectControllerBase
    {
        [HttpPost("messages")]
        public object SendMessage([FromBody] JsonElement _) => new { ok = true };
    }
}
