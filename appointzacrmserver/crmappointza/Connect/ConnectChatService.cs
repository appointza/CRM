using System.Text.Json;
using System.Text.RegularExpressions;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using CrmAppointza.Utils;

namespace CrmAppointza.Connect
{
    public class ConnectChatService
    {
        readonly InboundMessageService inboundMessageService;
        readonly LeadService leadService;
        readonly ConnectWhatsAppSendService whatsAppSendService;

        public ConnectChatService(
            InboundMessageService inboundMessageService,
            LeadService leadService,
            ConnectWhatsAppSendService whatsAppSendService)
        {
            this.inboundMessageService = inboundMessageService;
            this.leadService = leadService;
            this.whatsAppSendService = whatsAppSendService;
        }

        public async Task<List<object>> ListThreads(string organizationId, string channel)
        {
            var rows = await MessageRows(organizationId, channel);
            var leadNames = await LeadNameMap(organizationId);
            var threadMap = new Dictionary<string, object>();

            foreach (var m in rows.OrderByDescending(x => x.createdat))
            {
                var key = !string.IsNullOrEmpty(m.leadid) ? m.leadid : $"orphan:{m.fromaddress}";
                if (threadMap.ContainsKey(key)) continue;

                var leadName = m.leadid != null && leadNames.TryGetValue(m.leadid, out var n)
                    ? n
                    : m.fromaddress ?? "Unknown";
                var previewBody = m.direction == "outbound"
                    ? $"You: {m.textbody}"
                    : (m.textbody ?? m.subject ?? "");
                threadMap[key] = new
                {
                    leadId = m.leadid,
                    leadName,
                    contact = m.fromaddress,
                    lastMessage = m.textbody,
                    lastAt = m.createdat?.ToString("o") ?? "",
                    preview = previewBody.Length > 80 ? previewBody[..80] : previewBody,
                };
            }

            return threadMap
                .OrderByDescending(kv =>
                {
                    var lastAt = kv.Value.GetType().GetProperty("lastAt")?.GetValue(kv.Value) as string;
                    return lastAt ?? "";
                })
                .Select(kv => kv.Value)
                .Cast<object>()
                .ToList();
        }

        public async Task<List<object>> ListContacts(string organizationId, string channel)
        {
            var leads = await leadService.Select(new LeadSelectReq { organizationid = organizationId });
            return leads
                .Where(l => HasChannelContact(l, channel))
                .OrderBy(l => l.name)
                .Select(l => new
                {
                    id = l.id,
                    name = l.name,
                    phone = l.phone ?? "",
                    email = l.email ?? "",
                    facebookPsid = l.facebookpsid ?? "",
                })
                .Cast<object>()
                .ToList();
        }

        public async Task<object> GetThread(string organizationId, string leadId, string channel)
        {
            var leads = await leadService.Select(new LeadSelectReq { organizationid = organizationId, id = leadId });
            var lead = leads.FirstOrDefault();
            if (lead == null)
                return new { lead = (object?)null, messages = Array.Empty<object>() };

            var byLead = (await inboundMessageService.Select(new InboundMessageSelectReq
            {
                organizationid = organizationId,
                leadid = leadId,
                channel = channel,
            }))
                .Where(m => m.eventtype == "message")
                .ToList();

            var orphans = (await inboundMessageService.Select(new InboundMessageSelectReq
            {
                organizationid = organizationId,
                channel = channel,
            }))
                .Where(m => m.eventtype == "message" && string.IsNullOrEmpty(m.leadid))
                .ToList();

            var matchedOrphans = orphans.Where(m => MatchesLeadContact(lead, channel, m.fromaddress)).ToList();
            var merged = new Dictionary<string, InboundMessage>();
            foreach (var r in byLead.Concat(matchedOrphans))
                merged[r.id] = r;

            var messages = merged.Values
                .OrderBy(m => m.createdat)
                .Select(m => ConnectJsonMapper.InboundMessage(m, lead.name))
                .Cast<object>()
                .ToList();

            return new
            {
                lead = new
                {
                    id = lead.id,
                    name = lead.name,
                    phone = lead.phone ?? "",
                    email = lead.email ?? "",
                    facebookPsid = lead.facebookpsid ?? "",
                },
                messages,
            };
        }

        public async Task<object> Send(
            string organizationId,
            string userId,
            JsonElement body)
        {
            var channel = body.TryGetProperty("channel", out var ch) ? ch.GetString() ?? "whatsapp" : "whatsapp";
            if (!body.TryGetProperty("leadId", out var leadIdEl) || leadIdEl.GetString() is not { Length: > 0 } leadId)
                throw new AppException(AppException.ErrorCodes.BadRequest, "leadId required");

            var text = body.TryGetProperty("text", out var t) ? t.GetString() ?? "" : "";
            var templateName = body.TryGetProperty("templateName", out var tn) ? tn.GetString()?.Trim() : null;
            var templateLanguage = body.TryGetProperty("templateLanguage", out var tl) ? tl.GetString() : "en_US";
            if (string.IsNullOrWhiteSpace(text) && string.IsNullOrWhiteSpace(templateName))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Message text is required");

            var leads = await leadService.Select(new LeadSelectReq { organizationid = organizationId, id = leadId });
            var lead = leads.FirstOrDefault()
                ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Lead not found");

            string externalId = "";
            string toAddress;
            string recordText = text.Trim();

            if (channel == "whatsapp")
            {
                var phone = lead.phone ?? "";
                if (string.IsNullOrWhiteSpace(phone))
                    throw new AppException(AppException.ErrorCodes.BadRequest, "Lead has no phone number for WhatsApp");

                if (!string.IsNullOrWhiteSpace(templateName))
                {
                    var result = await whatsAppSendService.SendTemplate(
                        organizationId, phone, templateName!, templateLanguage ?? "en_US");
                    toAddress = result.to;
                    externalId = result.messageId ?? "";
                    recordText = string.IsNullOrWhiteSpace(text)
                        ? $"[Template: {templateName}]"
                        : $"[Template: {templateName}] {text.Trim()}";
                }
                else
                {
                    var result = await whatsAppSendService.SendText(organizationId, phone, text);
                    toAddress = result.to;
                    externalId = result.messageId ?? "";
                }
            }
            else if (channel == "facebook")
            {
                toAddress = (lead.facebookpsid ?? "").Trim();
                if (string.IsNullOrEmpty(toAddress))
                    throw new AppException(AppException.ErrorCodes.BadRequest, "Lead has no linked Facebook conversation");
                externalId = $"fb_sim_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            }
            else if (channel == "sms")
            {
                toAddress = (lead.phone ?? "").Trim();
                if (string.IsNullOrEmpty(toAddress))
                    throw new AppException(AppException.ErrorCodes.BadRequest, "Lead has no phone number for SMS");
                externalId = $"sms_sim_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            }
            else
            {
                toAddress = (lead.email ?? "").Trim();
                if (string.IsNullOrEmpty(toAddress))
                    throw new AppException(AppException.ErrorCodes.BadRequest, "Lead has no email address");
                externalId = $"email_sim_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            }

            var msg = await RecordOutbound(new OutboundRecord
            {
                OrganizationId = organizationId,
                Channel = channel,
                LeadId = leadId,
                ToAddress = toAddress,
                TextBody = recordText,
                Subject = body.TryGetProperty("subject", out var sub) ? sub.GetString() ?? "" : "",
                SentByUserId = userId,
                ExternalId = externalId,
            });

            return new { ok = true, message = ConnectJsonMapper.InboundMessage(msg, lead.name) };
        }

        public async Task RecordInboundWhatsApp(
            string organizationId,
            string fromPhone,
            string? contactName,
            string messageType,
            string textBody,
            string externalId,
            JsonElement payload)
        {
            if (string.IsNullOrEmpty(organizationId)) return;

            if (!string.IsNullOrEmpty(externalId))
            {
                var existing = await inboundMessageService.Select(new InboundMessageSelectReq
                {
                    organizationid = organizationId,
                    channel = "whatsapp",
                });
                if (existing.Any(m =>
                        m.externalid == externalId &&
                        (m.eventtype ?? "message") == "message"))
                    return;
            }

            await RecordInbound(new InboundRecord
            {
                OrganizationId = organizationId,
                Channel = "whatsapp",
                FromAddress = fromPhone,
                ContactName = contactName,
                TextBody = textBody,
                MessageType = messageType,
                ExternalId = externalId,
                EventType = "message",
                PayloadJson = payload.GetRawText(),
            });
        }

        public async Task RecordInboundStatus(
            string organizationId,
            string recipientId,
            string messageType,
            string externalId,
            JsonElement payload)
        {
            if (string.IsNullOrEmpty(organizationId)) return;
            var msg = new InboundMessage
            {
                organizationid = organizationId,
                channel = "whatsapp",
                fromaddress = recipientId,
                textbody = "",
                messagetype = messageType,
                externalid = externalId,
                eventtype = "status",
                direction = "inbound",
                payload = payload.GetRawText(),
                createdat = DateTime.UtcNow,
            };
            await inboundMessageService.Insert(msg);
        }

        async Task<InboundMessage> RecordInbound(InboundRecord data)
        {
            var leadId = await ResolveOrCreateLeadId(
                data.OrganizationId,
                data.Channel,
                data.FromAddress,
                data.ContactName);

            var msg = new InboundMessage
            {
                organizationid = data.OrganizationId,
                channel = data.Channel,
                leadid = leadId,
                fromaddress = data.FromAddress,
                textbody = data.TextBody ?? "",
                subject = data.Subject ?? "",
                messagetype = data.MessageType ?? "text",
                externalid = data.ExternalId ?? "",
                eventtype = data.EventType ?? "message",
                direction = "inbound",
                payload = data.PayloadJson ?? "{}",
                createdat = DateTime.UtcNow,
            };
            await inboundMessageService.Insert(msg);
            return msg;
        }

        async Task<InboundMessage> RecordOutbound(OutboundRecord data)
        {
            var msg = new InboundMessage
            {
                organizationid = data.OrganizationId,
                channel = data.Channel,
                leadid = data.LeadId,
                fromaddress = data.ToAddress,
                textbody = data.TextBody,
                subject = data.Subject ?? "",
                messagetype = data.Channel == "email" ? "email" : "text",
                externalid = data.ExternalId ?? "",
                eventtype = "message",
                direction = "outbound",
                sentbyuserid = data.SentByUserId,
                payload = "{}",
                createdat = DateTime.UtcNow,
            };
            await inboundMessageService.Insert(msg);
            return msg;
        }

        async Task<string?> ResolveOrCreateLeadId(
            string organizationId,
            string channel,
            string fromAddress,
            string? contactName)
        {
            var leads = await leadService.Select(new LeadSelectReq { organizationid = organizationId });

            if (channel == "email")
            {
                var from = fromAddress.Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(from)) return null;
                var match = leads.FirstOrDefault(l => (l.email ?? "").Trim().ToLowerInvariant() == from);
                if (match != null) return match.id;
                return await CreateLeadStub(organizationId, fromAddress.Trim(), fromAddress.Trim(), null, null, "email");
            }

            if (channel == "facebook")
            {
                var psid = fromAddress.Trim();
                if (string.IsNullOrEmpty(psid)) return null;
                var match = leads.FirstOrDefault(l => (l.facebookpsid ?? "").Trim() == psid);
                if (match != null) return match.id;
                var suffix = psid.Length >= 6 ? psid[^6..] : psid;
                return await CreateLeadStub(organizationId,
                    $"Facebook User {suffix}",
                    null, null, psid, "facebook");
            }

            var fromKey = ContactDigits(fromAddress);
            if (string.IsNullOrEmpty(fromKey)) return null;
            var phoneMatch = leads.FirstOrDefault(l => ContactDigits(l.phone ?? "") == fromKey);
            if (phoneMatch != null) return phoneMatch.id;
            return await CreateLeadStub(organizationId,
                string.IsNullOrWhiteSpace(contactName) ? fromAddress.Trim() : contactName.Trim(),
                fromAddress.Trim(), null, null, channel);
        }

        async Task<string> CreateLeadStub(
            string organizationId,
            string name,
            string? phone,
            string? email,
            string? facebookPsid,
            string source)
        {
            var lead = new Lead
            {
                organizationid = organizationId,
                name = string.IsNullOrWhiteSpace(name) ? "New contact" : name,
                phone = phone ?? "",
                email = email ?? "",
                facebookpsid = facebookPsid ?? "",
                source = source,
                type = "lead",
            };
            await leadService.Insert(lead);
            return lead.id;
        }

        async Task<List<InboundMessage>> MessageRows(string organizationId, string channel)
        {
            var rows = await inboundMessageService.Select(new InboundMessageSelectReq
            {
                organizationid = organizationId,
                channel = channel,
            });
            return rows
                .Where(m => m.eventtype == "message")
                .OrderByDescending(m => m.createdat)
                .Take(500)
                .ToList();
        }

        async Task<Dictionary<string, string>> LeadNameMap(string organizationId)
        {
            var leads = await leadService.Select(new LeadSelectReq { organizationid = organizationId });
            return leads.Where(l => !string.IsNullOrEmpty(l.id))
                .ToDictionary(l => l.id, l => l.name ?? "Unknown");
        }

        static bool HasChannelContact(Lead l, string channel) =>
            channel switch
            {
                "email" => !string.IsNullOrWhiteSpace(l.email),
                "facebook" => !string.IsNullOrWhiteSpace(l.facebookpsid),
                _ => !string.IsNullOrWhiteSpace(l.phone),
            };

        static bool MatchesLeadContact(Lead lead, string channel, string? fromAddress)
        {
            if (string.IsNullOrEmpty(fromAddress)) return false;
            if (channel == "email")
                return fromAddress.Trim().ToLowerInvariant() == (lead.email ?? "").Trim().ToLowerInvariant();
            if (channel == "facebook")
            {
                var psid = (lead.facebookpsid ?? "").Trim();
                return psid.Length > 0 && fromAddress.Trim() == psid;
            }
            var phoneKey = ContactDigits(lead.phone ?? "");
            return phoneKey.Length > 0 && ContactDigits(fromAddress) == phoneKey;
        }

        static string ContactDigits(string value)
        {
            var d = Regex.Replace(value ?? "", @"\D", "");
            return d.Length >= 10 ? d[^10..] : d;
        }

        sealed class InboundRecord
        {
            public string OrganizationId { get; set; } = "";
            public string Channel { get; set; } = "";
            public string FromAddress { get; set; } = "";
            public string? ContactName { get; set; }
            public string? TextBody { get; set; }
            public string? Subject { get; set; }
            public string? MessageType { get; set; }
            public string? ExternalId { get; set; }
            public string? EventType { get; set; }
            public string? PayloadJson { get; set; }
        }

        sealed class OutboundRecord
        {
            public string OrganizationId { get; set; } = "";
            public string Channel { get; set; } = "";
            public string LeadId { get; set; } = "";
            public string ToAddress { get; set; } = "";
            public string TextBody { get; set; } = "";
            public string? Subject { get; set; }
            public string? SentByUserId { get; set; }
            public string? ExternalId { get; set; }
        }
    }
}
