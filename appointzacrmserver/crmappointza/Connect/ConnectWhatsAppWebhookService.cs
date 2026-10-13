using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;

namespace CrmAppointza.Connect
{
    public class ConnectWhatsAppWebhookService
    {
        readonly ChannelConfigurationService channelConfigurationService;
        readonly ConnectChatService chatService;
        readonly ILogger<ConnectWhatsAppWebhookService> logger;

        public ConnectWhatsAppWebhookService(
            ChannelConfigurationService channelConfigurationService,
            ConnectChatService chatService,
            ILogger<ConnectWhatsAppWebhookService> logger)
        {
            this.channelConfigurationService = channelConfigurationService;
            this.chatService = chatService;
            this.logger = logger;
        }

        public async Task<bool> VerifySignatureAsync(byte[] rawBody, string? signatureHeader)
        {
            var secrets = await GetMetaAppSecretsAsync();
            if (secrets.Count == 0)
            {
                logger.LogWarning("No Meta App Secret in channel settings; WhatsApp signature check skipped");
                return true;
            }

            if (rawBody.Length == 0 || string.IsNullOrEmpty(signatureHeader) || !signatureHeader.StartsWith("sha256=", StringComparison.Ordinal))
                return false;

            foreach (var secret in secrets)
            {
                var expected = $"sha256={HmacSha256Hex(secret, rawBody)}";
                if (FixedTimeEquals(expected, signatureHeader))
                    return true;
            }

            return false;
        }

        public async Task HandlePayloadAsync(JsonElement body)
        {
            if (!body.TryGetProperty("entry", out var entry) || entry.ValueKind != JsonValueKind.Array)
                return;

            foreach (var ent in entry.EnumerateArray())
            {
                if (!ent.TryGetProperty("changes", out var changes) || changes.ValueKind != JsonValueKind.Array)
                    continue;

                foreach (var change in changes.EnumerateArray())
                {
                    if (!change.TryGetProperty("value", out var value))
                        continue;

                    var phoneNumberId = "";
                    if (value.TryGetProperty("metadata", out var metadata) &&
                        metadata.TryGetProperty("phone_number_id", out var pid))
                    {
                        phoneNumberId = pid.GetString() ?? "";
                    }

                    var organizationId = await FindOrganizationByPhoneNumberId(phoneNumberId);

                    string? ContactName(string fromPhone)
                    {
                        if (!value.TryGetProperty("contacts", out var contacts) ||
                            contacts.ValueKind != JsonValueKind.Array)
                            return null;
                        foreach (var c in contacts.EnumerateArray())
                        {
                            if (!c.TryGetProperty("wa_id", out var waId)) continue;
                            if ((waId.GetString() ?? "") != fromPhone) continue;
                            if (c.TryGetProperty("profile", out var profile) &&
                                profile.TryGetProperty("name", out var name))
                                return name.GetString();
                        }
                        return null;
                    }

                    if (value.TryGetProperty("messages", out var messages) &&
                        messages.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var msg in messages.EnumerateArray())
                        {
                            var fromPhone = msg.TryGetProperty("from", out var fromEl)
                                ? fromEl.GetString() ?? ""
                                : "";
                            var waMessageId = msg.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                            var messageType = msg.TryGetProperty("type", out var typeEl)
                                ? typeEl.GetString() ?? "unknown"
                                : "unknown";
                            var textBody = ConnectWhatsAppUtil.ExtractMessageText(msg);

                            if (string.IsNullOrEmpty(organizationId))
                            {
                                logger.LogError(
                                    "Dropped WhatsApp message {MessageId} — unknown org (check Phone number ID in Settings)",
                                    waMessageId);
                                continue;
                            }

                            logger.LogInformation("Inbound WhatsApp from {From}: {Preview}", fromPhone, textBody);
                            await chatService.RecordInboundWhatsApp(
                                organizationId,
                                fromPhone,
                                ContactName(fromPhone),
                                messageType,
                                textBody,
                                waMessageId,
                                msg);
                        }
                    }

                    if (value.TryGetProperty("statuses", out var statuses) &&
                        statuses.ValueKind == JsonValueKind.Array &&
                        !string.IsNullOrEmpty(organizationId))
                    {
                        foreach (var st in statuses.EnumerateArray())
                        {
                            var recipient = st.TryGetProperty("recipient_id", out var r) ? r.GetString() ?? "" : "";
                            var status = st.TryGetProperty("status", out var s) ? s.GetString() ?? "status" : "status";
                            var extId = st.TryGetProperty("id", out var sid) ? sid.GetString() ?? "" : "";
                            await chatService.RecordInboundStatus(organizationId, recipient, status, extId, st);
                        }
                    }
                }
            }
        }

        async Task<string?> FindOrganizationByPhoneNumberId(string phoneNumberId)
        {
            if (string.IsNullOrWhiteSpace(phoneNumberId))
                return null;

            var rows = await channelConfigurationService.Select(new ChannelConfigurationSelectReq());
            foreach (var row in rows)
            {
                var configured = ConnectChannelConfigHelper.ReadJsonString(row.whatsappconfig, "phoneNumberId");
                if (configured == phoneNumberId)
                    return row.organizationid;
            }

            var configuredRows = rows.Where(r =>
            {
                var pid = ConnectChannelConfigHelper.ReadJsonString(r.whatsappconfig, "phoneNumberId");
                return !string.IsNullOrEmpty(pid);
            }).ToList();

            if (configuredRows.Count() == 1)
            {
                logger.LogWarning(
                    "Webhook phone_number_id {PhoneNumberId} did not match Settings; using sole configured org",
                    phoneNumberId);
                return configuredRows[0].organizationid;
            }

            return null;
        }

        async Task<List<string>> GetMetaAppSecretsAsync()
        {
            var rows = await channelConfigurationService.Select(new ChannelConfigurationSelectReq());
            var secrets = new HashSet<string>(StringComparer.Ordinal);
            foreach (var row in rows)
            {
                var fb = ConnectChannelConfigHelper.ReadJsonString(row.facebookconfig, "appSecret");
                if (fb != null) secrets.Add(fb);
                var wa = ConnectChannelConfigHelper.ReadJsonString(row.whatsappconfig, "appSecret");
                if (wa != null) secrets.Add(wa);
            }
            return secrets.ToList();
        }

        static string HmacSha256Hex(string secret, byte[] body)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            return Convert.ToHexString(hmac.ComputeHash(body)).ToLowerInvariant();
        }

        static bool FixedTimeEquals(string a, string b)
        {
            var ba = Encoding.UTF8.GetBytes(a);
            var bb = Encoding.UTF8.GetBytes(b);
            return ba.Length == bb.Length && CryptographicOperations.FixedTimeEquals(ba, bb);
        }
    }
}
