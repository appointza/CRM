using System.Text.Json;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using CrmAppointza.Utils;

namespace CrmAppointza.Connect
{
    public class ConnectAppService
    {
        readonly LeadService leadService;
        readonly OrganizationService organizationService;
        readonly UserService userService;
        readonly TemplateService templateService;
        readonly CampaignService campaignService;
        readonly LeadGroupService leadGroupService;
        readonly ReferenceValueService referenceValueService;
        readonly ApiKeyService apiKeyService;
        readonly BillingWalletService billingWalletService;
        readonly BillingTransactionService billingTransactionService;
        readonly InboundMessageService inboundMessageService;
        readonly ChannelConfigurationService channelConfigurationService;

        public ConnectAppService(
            LeadService leadService,
            OrganizationService organizationService,
            UserService userService,
            TemplateService templateService,
            CampaignService campaignService,
            LeadGroupService leadGroupService,
            ReferenceValueService referenceValueService,
            ApiKeyService apiKeyService,
            BillingWalletService billingWalletService,
            BillingTransactionService billingTransactionService,
            InboundMessageService inboundMessageService,
            ChannelConfigurationService channelConfigurationService)
        {
            this.leadService = leadService;
            this.organizationService = organizationService;
            this.userService = userService;
            this.templateService = templateService;
            this.campaignService = campaignService;
            this.leadGroupService = leadGroupService;
            this.referenceValueService = referenceValueService;
            this.apiKeyService = apiKeyService;
            this.billingWalletService = billingWalletService;
            this.billingTransactionService = billingTransactionService;
            this.inboundMessageService = inboundMessageService;
            this.channelConfigurationService = channelConfigurationService;
        }

        public async Task<List<object>> ListLeads(ConnectUserContext user, string? headerOrgId)
        {
            List<Lead> rows;
            if (user.Role == ConnectTenant.SuperAdminRole && string.IsNullOrWhiteSpace(headerOrgId))
                rows = await leadService.Select(new LeadSelectReq());
            else
            {
                var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
                rows = await leadService.Select(new LeadSelectReq { organizationid = orgId });
            }
            return rows.Select(ConnectJsonMapper.Lead).Cast<object>().ToList();
        }

        public async Task<object> CreateLead(ConnectUserContext user, string? headerOrgId, JsonElement body)
        {
            var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
            var input = ConnectLeadMapper.FromJsonBody(body);
            var lead = await leadService.InsertWithConnectDefaults(orgId, input);
            return ConnectJsonMapper.Lead(lead);
        }

        public async Task<object> UpdateLead(ConnectUserContext user, string leadId, JsonElement body)
        {
            var lead = await leadService.GetById(leadId) ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Lead not found");
            AssertLeadAccess(user, lead);
            if (body.TryGetProperty("tags", out var tagsEl))
                lead.tags = tagsEl.GetRawText();
            foreach (var prop in new[] { "name", "phone", "email", "businessName", "ownerName", "category", "website", "mapsUrl", "address", "pinCode", "area", "city", "state", "type", "source" })
            {
                if (!body.TryGetProperty(prop, out var val))
                    continue;
                var s = val.ValueKind == JsonValueKind.String ? val.GetString() : val.GetRawText();
                switch (prop)
                {
                    case "name": lead.name = s; break;
                    case "phone": lead.phone = s; break;
                    case "email": lead.email = s; break;
                    case "businessName": lead.businessname = s; break;
                    case "ownerName": lead.ownername = s; break;
                    case "category": lead.category = s; break;
                    case "website": lead.website = s; break;
                    case "mapsUrl": lead.mapsurl = s; break;
                    case "address": lead.address = s; break;
                    case "pinCode": lead.pincode = s; break;
                    case "area": lead.area = s; break;
                    case "city": lead.city = s; break;
                    case "state": lead.state = s; break;
                    case "type": lead.type = s; break;
                    case "source": lead.source = s; break;
                }
            }
            await leadService.Update(lead);
            return ConnectJsonMapper.Lead(lead);
        }

        public async Task<object> BulkLeads(ConnectUserContext user, string? headerOrgId, JsonElement body)
        {
            var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
            var items = ConnectLeadMapper.LeadArrayFromBulkBody(body);
            if (items.Count > 2000)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Maximum 2000 rows per import");
            var res = await leadService.BulkInsertWithConnectDefaults(orgId, items);
            return new
            {
                ok = res.ok,
                created = res.created,
                failed = res.failed,
                errors = res.errors,
                leads = res.leads.Select(ConnectJsonMapper.Lead).ToList(),
            };
        }

        public async Task<object> ImportLeadsFromPlaces(ConnectUserContext user, string? headerOrgId, JsonElement body)
        {
            var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
            var rows = ConnectLeadMapper.PlaceImportRowsFromBody(body);
            var res = await leadService.ImportFromPlaces(orgId, rows);
            return new
            {
                ok = res.ok,
                created = res.created,
                skipped = res.skipped,
                items = res.items,
            };
        }

        public async Task<object> DeleteLead(ConnectUserContext user, string leadId)
        {
            var lead = await leadService.GetById(leadId) ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Lead not found");
            AssertLeadAccess(user, lead);
            await leadService.Delete(new LeadDeleteReq { id = leadId, organizationid = lead.organizationid });
            return new { ok = true, id = leadId };
        }

        public async Task<object> TransitionLead(ConnectUserContext user, string leadId, JsonElement body)
        {
            var lead = await leadService.GetById(leadId) ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Lead not found");
            AssertLeadAccess(user, lead);
            var toType = body.TryGetProperty("toType", out var t) ? t.GetString() : body.TryGetProperty("type", out var t2) ? t2.GetString() : null;
            if (string.IsNullOrWhiteSpace(toType))
                throw new AppException(AppException.ErrorCodes.BadRequest, "toType is required");
            var reason = body.TryGetProperty("reason", out var r) ? r.GetString() : null;
            var updated = await leadService.Transition(leadId, toType!, reason, user.Sub);
            return ConnectJsonMapper.Lead(updated);
        }

        public async Task<object> AddLeadNote(ConnectUserContext user, string leadId, JsonElement body)
        {
            var lead = await leadService.GetById(leadId) ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Lead not found");
            AssertLeadAccess(user, lead);
            var text = body.TryGetProperty("text", out var t) ? t.GetString() : null;
            var updated = await leadService.AddNote(leadId, text ?? "", user.Sub);
            return ConnectJsonMapper.Lead(updated);
        }

        public async Task<List<object>> LeadReplies(ConnectUserContext user, string leadId)
        {
            var lead = await leadService.GetById(leadId) ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Lead not found");
            AssertLeadAccess(user, lead);
            var rows = await inboundMessageService.Select(new InboundMessageSelectReq
            {
                organizationid = lead.organizationid,
                leadid = leadId,
            });
            return rows.OrderBy(m => m.createdat).Select(m => ConnectJsonMapper.InboundMessage(m)).Cast<object>().ToList();
        }

        public async Task<object?> GetOrganization(string orgId) =>
            (await organizationService.Select(new OrganizationSelectReq { id = orgId })).FirstOrDefault() is { } o
                ? ConnectJsonMapper.Organization(o)
                : null;

        public async Task<object> PatchOrganization(string orgId, JsonElement body)
        {
            var org = (await organizationService.Select(new OrganizationSelectReq { id = orgId })).FirstOrDefault()
                ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Organization not found");
            ApplyOrgPatch(org, body);
            await organizationService.Update(org);
            return ConnectJsonMapper.Organization(org);
        }

        public async Task<object> DashboardStats(ConnectUserContext user, string? headerOrgId)
        {
            List<Lead> leads;
            List<Campaign> campaigns;
            if (user.Role == ConnectTenant.SuperAdminRole && string.IsNullOrWhiteSpace(headerOrgId))
            {
                leads = await leadService.Select(new LeadSelectReq());
                campaigns = await campaignService.Select(new CampaignSelectReq());
            }
            else
            {
                var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
                leads = await leadService.Select(new LeadSelectReq { organizationid = orgId });
                campaigns = await campaignService.Select(new CampaignSelectReq { organizationid = orgId });
            }

            var totals = new { sms = 0, whatsapp = 0, email = 0 };
            foreach (var c in campaigns)
            {
                if (c.channel == "sms") totals = totals with { sms = totals.sms + (c.sent ?? 0) };
                if (c.channel == "whatsapp") totals = totals with { whatsapp = totals.whatsapp + (c.sent ?? 0) };
                if (c.channel == "email") totals = totals with { email = totals.email + (c.sent ?? 0) };
            }
            var totalMessages = totals.sms + totals.whatsapp + totals.email;
            var recent = campaigns.OrderByDescending(c => c.createdat).Take(5).Select(ConnectJsonMapper.Campaign).ToList();
            var baseTrend = totalMessages > 0 ? totalMessages / 7 : 0;
            var trend = Enumerable.Repeat(baseTrend, 7).ToArray();
            trend[6] += totalMessages - baseTrend * 7;

            return new
            {
                totalLeads = leads.Count,
                totalCampaigns = campaigns.Count,
                totalMessages,
                channels = totals,
                recent,
                trend,
            };
        }

        public async Task<object> Billing(ConnectUserContext user, string? headerOrgId)
        {
            var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
            var wallet = (await billingWalletService.Select(new BillingWalletSelectReq { organizationid = orgId })).FirstOrDefault()
                ?? await billingWalletService.Insert(new BillingWallet { organizationid = orgId, balance = 0 });
            var txs = await billingTransactionService.Select(new BillingTransactionSelectReq { walletid = wallet.id });
            return new
            {
                wallet = wallet.balance ?? 0,
                usage = new { sms = 0, whatsapp = 0, email = 0 },
                rates = new { sms = 0.35, whatsapp = 0.8, email = 0.15 },
                lowBalanceThreshold = 500,
                transactions = txs.OrderByDescending(t => t.date).Select(t => new
                {
                    id = t.id,
                    date = ConnectJsonMapper.DateOnly(t.date),
                    desc = t.description,
                    amount = t.amount ?? 0,
                    type = t.type,
                    channel = t.channel ?? "",
                }).ToList(),
            };
        }

        public async Task<object> TopUp(ConnectUserContext user, string? headerOrgId, decimal amount)
        {
            if (amount <= 0 || amount > 1_000_000)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Invalid top-up amount");
            var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
            var wallet = (await billingWalletService.Select(new BillingWalletSelectReq { organizationid = orgId })).FirstOrDefault()
                ?? await billingWalletService.Insert(new BillingWallet { organizationid = orgId, balance = 0 });
            wallet.balance = (wallet.balance ?? 0) + amount;
            await billingWalletService.Update(wallet);
            await billingTransactionService.Insert(new BillingTransaction
            {
                walletid = wallet.id,
                amount = amount,
                type = "credit",
                description = "Wallet top-up",
                date = DateTime.UtcNow,
                channel = "",
            });
            return await Billing(user, headerOrgId);
        }

        public async Task<List<object>> ListUsers(ConnectUserContext user, string? headerOrgId)
        {
            var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
            var rows = await userService.Select(new UserSelectReq { organizationid = orgId });
            return rows.Select(ConnectJsonMapper.User).Cast<object>().ToList();
        }

        public async Task<List<object>> ListTemplates(ConnectUserContext user, string? headerOrgId)
        {
            var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
            var rows = await templateService.Select(new TemplateSelectReq { organizationid = orgId });
            return rows.Select(ConnectJsonMapper.Template).Cast<object>().ToList();
        }

        public async Task<List<object>> ListCampaigns(ConnectUserContext user, string? headerOrgId)
        {
            if (user.Role == ConnectTenant.SuperAdminRole && string.IsNullOrWhiteSpace(headerOrgId))
            {
                var all = await campaignService.Select(new CampaignSelectReq());
                return all.Select(ConnectJsonMapper.Campaign).Cast<object>().ToList();
            }
            var orgId = ConnectTenant.ResolveOrganizationId(user, headerOrgId);
            var rows = await campaignService.Select(new CampaignSelectReq { organizationid = orgId });
            return rows.Select(ConnectJsonMapper.Campaign).Cast<object>().ToList();
        }

        public async Task<List<object>> ListReferenceValues(string orgId)
        {
            await referenceValueService.SeedDefaultsIfMissing(orgId);
            var rows = await referenceValueService.Select(new ReferenceValueSelectReq { organizationid = orgId });
            return rows.Select(ConnectJsonMapper.ReferenceValue).Cast<object>().ToList();
        }

        public async Task<List<object>> ListLeadGroups(string orgId)
        {
            var rows = await leadGroupService.Select(new LeadGroupSelectReq { organizationid = orgId });
            return rows.Select(ConnectJsonMapper.LeadGroup).Cast<object>().ToList();
        }

        public async Task<List<object>> ListApiKeys(string orgId)
        {
            var rows = await apiKeyService.Select(new ApiKeySelectReq { organizationid = orgId });
            return rows.Select(ConnectJsonMapper.ApiKey).Cast<object>().ToList();
        }

        public async Task<List<object>> Inbox(string orgId, string? channel, string? leadId)
        {
            var req = new InboundMessageSelectReq { organizationid = orgId };
            if (!string.IsNullOrWhiteSpace(channel)) req.channel = channel;
            if (!string.IsNullOrWhiteSpace(leadId)) req.leadid = leadId;
            var rows = await inboundMessageService.Select(req);
            return rows.OrderByDescending(m => m.createdat).Select(m => ConnectJsonMapper.InboundMessage(m)).Cast<object>().ToList();
        }

        public async Task<List<object>> Tenants()
        {
            var orgs = await organizationService.Select(new OrganizationSelectReq());
            var result = new List<object>();
            foreach (var o in orgs.OrderByDescending(x => x.createdat))
            {
                var users = await userService.Select(new UserSelectReq { organizationid = o.id });
                var leads = await leadService.Select(new LeadSelectReq { organizationid = o.id });
                var camps = await campaignService.Select(new CampaignSelectReq { organizationid = o.id });
                var wallet = (await billingWalletService.Select(new BillingWalletSelectReq { organizationid = o.id })).FirstOrDefault();
                result.Add(new
                {
                    id = o.id,
                    name = o.name,
                    plan = o.plan,
                    userCount = users.Count,
                    leadCount = leads.Count,
                    campaignCount = camps.Count,
                    wallet = wallet?.balance ?? 0,
                });
            }
            return result;
        }

        static void AssertLeadAccess(ConnectUserContext user, Lead lead)
        {
            if (user.Role == ConnectTenant.SuperAdminRole) return;
            if (!string.Equals(user.OrganizationId, lead.organizationid, StringComparison.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.Forbidden, "Lead belongs to another organization.");
        }

        static void ApplyOrgPatch(Organization org, JsonElement body)
        {
            void Set(string jsonName, Action<string?> set)
            {
                if (body.TryGetProperty(jsonName, out var v) && v.ValueKind == JsonValueKind.String)
                    set(v.GetString());
            }
            Set("name", s => org.name = s);
            Set("plan", s => org.plan = s);
            Set("industry", s => org.industry = s);
            Set("country", s => org.country = s);
            Set("timezone", s => org.timezone = s);
            Set("website", s => org.website = s);
            Set("supportEmail", s => org.supportemail = s);
            Set("billingEmail", s => org.billingemail = s);
            Set("address", s => org.address = s);
            Set("gstin", s => org.gstin = s);
        }
    }
}
