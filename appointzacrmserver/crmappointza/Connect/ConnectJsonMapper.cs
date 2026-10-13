using System.Text.Json;
using CrmAppointza.Models.CrmAppointza;

namespace CrmAppointza.Connect
{
    public static class ConnectJsonMapper
    {
        public static string DateOnly(DateTime? d) =>
            d.HasValue ? d.Value.ToString("yyyy-MM-dd") : "";

        public static object Organization(Organization o) => new
        {
            id = o.id,
            name = o.name,
            plan = o.plan,
            industry = o.industry,
            country = o.country,
            timezone = o.timezone,
            website = o.website,
            supportEmail = o.supportemail,
            billingEmail = o.billingemail,
            address = o.address,
            gstin = o.gstin,
            createdAt = DateOnly(o.createdat),
        };

        public static object User(User u) => new
        {
            id = u.id,
            name = u.name,
            email = u.email,
            role = u.role,
            organization_id = u.organizationid,
        };

        public static object Lead(Lead l)
        {
            JsonElement? tags = ParseJson(l.tags);
            JsonElement? notes = ParseJson(l.notes);
            JsonElement? stageHistory = ParseJson(l.stagehistory);
            return new
            {
                id = l.id,
                organization_id = l.organizationid,
                name = l.name,
                phone = l.phone,
                email = l.email,
                facebookPsid = l.facebookpsid ?? "",
                businessName = l.businessname,
                ownerName = l.ownername,
                category = l.category,
                website = l.website,
                mapsUrl = l.mapsurl,
                address = l.address,
                pinCode = l.pincode,
                area = l.area,
                city = l.city,
                state = l.state,
                type = l.type,
                source = l.source ?? "manual",
                tags = tags ?? JsonSerializer.SerializeToElement(Array.Empty<string>()),
                notes = notes ?? JsonSerializer.SerializeToElement(Array.Empty<object>()),
                stageHistory = stageHistory ?? JsonSerializer.SerializeToElement(Array.Empty<object>()),
                createdAt = DateOnly(l.createdat),
            };
        }

        public static object ReferenceValue(ReferenceValue r) => new
        {
            id = r.id,
            organization_id = r.organizationid,
            code = r.code,
            category = r.category,
            referenceValue = r.referencevalue,
            referenceCode = r.referencecode,
            colorCode = r.colorcode,
            monthCount = r.monthcount ?? 0,
            createdAt = DateOnly(r.createdat),
        };

        public static object Template(Template t)
        {
            JsonElement? buttons = ParseJson(t.buttons);
            JsonElement? variableMapping = ParseJson(t.variablemapping);
            return new
            {
                id = t.id,
                organization_id = t.organizationid,
                channel = t.channel,
                name = t.name,
                body = t.body,
                language = t.language ?? "",
                status = t.status ?? "",
                category = t.category ?? "",
                meta_id = t.metaid ?? "",
                variables_count = t.variablescount ?? 0,
                header_type = t.headertype ?? "",
                header_content = t.headercontent ?? "",
                footer = t.footer ?? "",
                buttons = buttons ?? JsonSerializer.SerializeToElement(Array.Empty<object>()),
                variable_mapping = variableMapping ?? JsonSerializer.SerializeToElement(new { }),
            };
        }

        public static object Campaign(Campaign c)
        {
            JsonElement? leadIds = ParseJson(c.leadids);
            JsonElement? recipientResults = ParseJson(c.recipientresults);
            return new
            {
                id = c.id,
                organization_id = c.organizationid,
                name = c.name,
                channel = c.channel,
                templateId = c.templateid,
                leadIds = leadIds ?? JsonSerializer.SerializeToElement(Array.Empty<string>()),
                status = c.status,
                sent = c.sent ?? 0,
                delivered = c.delivered ?? 0,
                failed = c.failed ?? 0,
                recipient_results = recipientResults ?? JsonSerializer.SerializeToElement(Array.Empty<object>()),
                createdAt = DateOnly(c.createdat),
            };
        }

        public static object LeadGroup(LeadGroup g)
        {
            JsonElement? leadIds = ParseJson(g.leadids);
            var ids = leadIds?.ValueKind == JsonValueKind.Array ? leadIds.Value.GetArrayLength() : 0;
            return new
            {
                id = g.id,
                organization_id = g.organizationid,
                name = g.name,
                leadIds = leadIds ?? JsonSerializer.SerializeToElement(Array.Empty<string>()),
                memberCount = ids,
                createdAt = DateOnly(g.createdat),
            };
        }

        public static object ApiKey(ApiKey k) => new
        {
            id = k.id,
            label = k.label,
            prefix = $"{k.prefix}…",
            createdAt = DateOnly(k.createdat),
            lastUsed = k.lastused.HasValue ? DateOnly(k.lastused) : null,
        };

        public static object InboundMessage(InboundMessage m, string? leadName = null)
        {
            var row = new
            {
                id = m.id,
                organization_id = m.organizationid,
                channel = m.channel,
                leadId = m.leadid,
                fromAddress = m.fromaddress,
                textBody = m.textbody,
                subject = m.subject,
                messageType = m.messagetype,
                externalId = m.externalid,
                eventType = m.eventtype,
                direction = m.direction ?? "inbound",
                sentByUserId = m.sentbyuserid,
                createdAt = m.createdat?.ToString("o") ?? "",
            };
            if (leadName == null) return row;
            return new
            {
                row.id,
                row.organization_id,
                row.channel,
                row.leadId,
                row.fromAddress,
                row.textBody,
                row.subject,
                row.messageType,
                row.externalId,
                row.eventType,
                row.direction,
                row.sentByUserId,
                row.createdAt,
                leadName,
            };
        }

        private static JsonElement? ParseJson(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return null;
            try
            {
                return JsonSerializer.Deserialize<JsonElement>(raw);
            }
            catch
            {
                return null;
            }
        }
    }
}
