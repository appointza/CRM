using System.Text.Json;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using CrmAppointza.Utils;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Connect.Controllers
{
    [ApiController]
    [Route("organizations")]
    public class ConnectOrganizationsController : ConnectControllerBase
    {
        readonly ConnectAppService appService;
        readonly ConnectChannelConfigHelper channelConfig;
        readonly ReferenceValueService referenceValueService;
        readonly LeadGroupService leadGroupService;
        readonly ApiKeyService apiKeyService;
        readonly ConnectChatService chatService;
        readonly ConnectGooglePlacesService googlePlacesService;

        public ConnectOrganizationsController(
            ConnectAppService appService,
            ConnectChannelConfigHelper channelConfig,
            ReferenceValueService referenceValueService,
            LeadGroupService leadGroupService,
            ApiKeyService apiKeyService,
            ConnectChatService chatService,
            ConnectGooglePlacesService googlePlacesService)
        {
            this.appService = appService;
            this.channelConfig = channelConfig;
            this.referenceValueService = referenceValueService;
            this.leadGroupService = leadGroupService;
            this.apiKeyService = apiKeyService;
            this.chatService = chatService;
            this.googlePlacesService = googlePlacesService;
        }

        [HttpGet("{id}")]
        public async Task<object> Get(string id)
        {
            RequireUser();
            return await appService.GetOrganization(id) ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Organization not found");
        }

        [HttpPatch("{id}")]
        public Task<object> Patch(string id, [FromBody] JsonElement body)
        {
            RequireUser();
            return appService.PatchOrganization(id, body);
        }

        [HttpGet("{id}/channel-config")]
        public Task<object> ChannelConfigGet(string id)
        {
            var user = RequireUser();
            ConnectTenant.ResolveOrganizationId(user, HeaderOrgId() ?? id);
            return channelConfig.GetJson(id);
        }

        [HttpPatch("{id}/channel-config/{ch}")]
        public Task<object> ChannelConfigPatch(string id, string ch, [FromBody] JsonElement body)
        {
            var user = RequireUser();
            ConnectTenant.ResolveOrganizationId(user, HeaderOrgId() ?? id);
            return channelConfig.PatchChannel(id, ch, body);
        }

        [HttpPost("{id}/channel-config/{ch}/verify")]
        public Task<object> ChannelConfigVerify(string id, string ch)
        {
            var user = RequireUser();
            ConnectTenant.ResolveOrganizationId(user, HeaderOrgId() ?? id);
            return channelConfig.VerifyChannel(id, ch);
        }

        [HttpGet("{id}/places/search")]
        public Task<object> PlacesSearch(string id, [FromQuery] string? query, [FromQuery] string? lat, [FromQuery] string? lng)
        {
            RequireUser();
            return googlePlacesService.Search(id, query, lat, lng);
        }

        [HttpGet("{id}/places/{placeId}")]
        public Task<object> PlaceDetails(string id, string placeId)
        {
            RequireUser();
            return googlePlacesService.PlaceDetails(id, placeId);
        }

        [HttpGet("{id}/google-maps-config")]
        public Task<object> GoogleMapsConfig(string id)
        {
            RequireUser();
            return googlePlacesService.MapsClientConfig(id);
        }

        [HttpGet("{id}/places/geocode")]
        public Task<object> PlacesGeocode(string id, [FromQuery] string? address)
        {
            RequireUser();
            return googlePlacesService.Geocode(id, address);
        }

        [HttpGet("{id}/reference-values")]
        public Task<List<object>> ReferenceValues(string id)
        {
            RequireUser();
            return appService.ListReferenceValues(id);
        }

        [HttpPost("{id}/reference-values")]
        public async Task<object> ReferenceValuesCreate(string id, [FromBody] JsonElement body)
        {
            RequireUser();
            var row = new ReferenceValue
            {
                organizationid = id,
                code = body.GetProperty("code").GetString(),
                category = body.GetProperty("category").GetString(),
                referencevalue = body.TryGetProperty("referenceValue", out var rv) ? rv.GetString() : "",
                referencecode = body.TryGetProperty("referenceCode", out var rc) ? rc.GetString() : "",
                colorcode = body.TryGetProperty("colorCode", out var cc) ? cc.GetString() : "",
                monthcount = body.TryGetProperty("monthCount", out var mc) && mc.TryGetInt32(out var m) ? m : 0,
                createdat = DateTime.UtcNow,
            };
            await referenceValueService.Insert(row);
            return ConnectJsonMapper.ReferenceValue(row);
        }

        [HttpGet("{id}/lead-groups")]
        public Task<List<object>> LeadGroups(string id)
        {
            RequireUser();
            return appService.ListLeadGroups(id);
        }

        [HttpPost("{id}/lead-groups")]
        public async Task<object> LeadGroupsCreate(string id, [FromBody] JsonElement body)
        {
            RequireUser();
            var row = new LeadGroup
            {
                organizationid = id,
                name = body.GetProperty("name").GetString(),
                leadids = body.TryGetProperty("leadIds", out var lids) ? lids.GetRawText() : "[]",
                createdat = DateTime.UtcNow,
            };
            await leadGroupService.Insert(row);
            return ConnectJsonMapper.LeadGroup(row);
        }

        [HttpGet("{id}/api-keys")]
        public Task<List<object>> ApiKeys(string id)
        {
            RequireUser();
            return appService.ListApiKeys(id);
        }

        [HttpGet("{id}/inbox")]
        public Task<List<object>> Inbox(string id, [FromQuery] string? channel, [FromQuery] string? leadId)
        {
            RequireUser();
            return appService.Inbox(id, channel, leadId);
        }

        [HttpGet("{id}/chat/threads")]
        public Task<List<object>> ChatThreads(string id, [FromQuery] string channel = "whatsapp")
        {
            RequireUser();
            return chatService.ListThreads(id, channel);
        }

        [HttpGet("{id}/chat/contacts")]
        public Task<List<object>> ChatContacts(string id, [FromQuery] string channel = "whatsapp")
        {
            RequireUser();
            return chatService.ListContacts(id, channel);
        }

        [HttpGet("{id}/chat/threads/{leadId}")]
        public Task<object> ChatThread(string id, string leadId, [FromQuery] string channel = "whatsapp")
        {
            RequireUser();
            return chatService.GetThread(id, leadId, channel);
        }

        [HttpPost("{id}/chat/send")]
        public Task<object> ChatSend(string id, [FromBody] JsonElement body)
        {
            var user = RequireUser();
            return chatService.Send(id, user.Sub, body);
        }
    }
}
