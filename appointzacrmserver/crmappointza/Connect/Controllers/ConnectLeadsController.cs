using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Connect.Controllers
{
    [ApiController]
    [Route("leads")]
    public class ConnectLeadsController : ConnectControllerBase
    {
        readonly ConnectAppService appService;

        public ConnectLeadsController(ConnectAppService appService)
        {
            this.appService = appService;
        }

        [HttpGet]
        public Task<List<object>> List() => appService.ListLeads(RequireUser(), HeaderOrgId());

        [HttpPost]
        public Task<object> Create([FromBody] JsonElement body) =>
            appService.CreateLead(RequireUser(), HeaderOrgId(), body);

        [HttpPost("bulk")]
        public Task<object> Bulk([FromBody] JsonElement body) =>
            appService.BulkLeads(RequireUser(), HeaderOrgId(), body);

        [HttpPost("from-places")]
        public Task<object> FromPlaces([FromBody] JsonElement body) =>
            appService.ImportLeadsFromPlaces(RequireUser(), HeaderOrgId(), body);

        [HttpDelete("{id}")]
        public Task<object> Delete(string id) =>
            appService.DeleteLead(RequireUser(), id);

        [HttpPatch("{id}")]
        public Task<object> Patch(string id, [FromBody] JsonElement body) =>
            appService.UpdateLead(RequireUser(), id, body);

        [HttpPost("{id}/transition")]
        public Task<object> Transition(string id, [FromBody] JsonElement body) =>
            appService.TransitionLead(RequireUser(), id, body);

        [HttpPost("{id}/notes")]
        public Task<object> Notes(string id, [FromBody] JsonElement body) =>
            appService.AddLeadNote(RequireUser(), id, body);

        [HttpGet("{id}/replies")]
        public Task<List<object>> Replies(string id) =>
            appService.LeadReplies(RequireUser(), id);
    }
}
