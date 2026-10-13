using System.Text.Json;
using System.Text.Json.Nodes;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;

namespace CrmAppointza.Connect
{
    public class ConnectChannelConfigHelper
    {
        readonly ChannelConfigurationService channelConfigurationService;
        readonly IConfiguration configuration;

        public ConnectChannelConfigHelper(
            ChannelConfigurationService channelConfigurationService,
            IConfiguration configuration)
        {
            this.channelConfigurationService = channelConfigurationService;
            this.configuration = configuration;
        }

        public async Task<object> GetJson(string organizationId)
        {
            var row = await channelConfigurationService.EnsureForOrganization(organizationId);
            row = await EnsureWebhookVerifyTokens(row);
            return ToResponse(row);
        }

        public async Task<object> PatchChannel(string organizationId, string channel, JsonElement body)
        {
            var ch = channel.ToLowerInvariant();
            if (ch is "google" or "google-maps" or "googlemaps")
                return await PatchGoogleApiKey(organizationId, body);

            var row = await channelConfigurationService.EnsureForOrganization(organizationId);
            var key = ch switch
            {
                "email" => "emailconfig",
                "whatsapp" => "whatsappconfig",
                "facebook" => "facebookconfig",
                _ => "smsconfig",
            };

            var existingRaw = key switch
            {
                "emailconfig" => row.emailconfig,
                "whatsappconfig" => row.whatsappconfig,
                "facebookconfig" => row.facebookconfig,
                _ => row.smsconfig,
            };
            var merged = MergeJsonObject(existingRaw, body);
            switch (key)
            {
                case "emailconfig": row.emailconfig = merged; break;
                case "whatsappconfig": row.whatsappconfig = merged; break;
                case "facebookconfig": row.facebookconfig = merged; break;
                default: row.smsconfig = merged; break;
            }
            await channelConfigurationService.Update(row);
            return ToChannelResponse(row, ch);
        }

        async Task<object> PatchGoogleApiKey(string organizationId, JsonElement body)
        {
            var row = await channelConfigurationService.EnsureForOrganization(organizationId);
            var key = body.TryGetProperty("googleApiKey", out var k) ? k.GetString()?.Trim() : null;
            row.googleapikey = key ?? "";
            await channelConfigurationService.Update(row);
            return new { googleApiKey = row.googleapikey ?? "" };
        }

        public async Task<object> VerifyChannel(string organizationId, string channel)
        {
            var row = await channelConfigurationService.EnsureForOrganization(organizationId);
            var ch = channel.ToLowerInvariant();
            var baseUrl = GetPublicBaseUrl();

            switch (ch)
            {
                case "email":
                {
                    var email = MergeChannelConfig(DefaultEmail(), ParseObject(row.emailconfig));
                    email["domainVerified"] = true;
                    email["dkimVerified"] = true;
                    email["spfVerified"] = true;
                    email["sandboxMode"] = false;
                    row.emailconfig = email.ToJsonString();
                    break;
                }
                case "whatsapp":
                {
                    var wa = MergeChannelConfig(DefaultWhatsapp(baseUrl), ParseObject(row.whatsappconfig));
                    var phoneId = wa["phoneNumberId"]?.GetValue<string>()?.Trim() ?? "";
                    var waba = wa["wabaId"]?.GetValue<string>()?.Trim() ?? "";
                    var token = wa["accessToken"]?.GetValue<string>()?.Trim() ?? "";
                    if (!string.IsNullOrEmpty(phoneId) && !string.IsNullOrEmpty(waba) && !string.IsNullOrEmpty(token))
                    {
                        wa["verified"] = true;
                        wa["lastVerifiedAt"] = DateTime.UtcNow.ToString("o");
                    }
                    row.whatsappconfig = wa.ToJsonString();
                    break;
                }
                case "facebook":
                {
                    var fb = MergeChannelConfig(DefaultFacebook(baseUrl), ParseObject(row.facebookconfig));
                    fb["verified"] = true;
                    row.facebookconfig = fb.ToJsonString();
                    break;
                }
                default:
                {
                    var sms = MergeChannelConfig(DefaultSms(), ParseObject(row.smsconfig));
                    sms["dltEnabled"] = true;
                    row.smsconfig = sms.ToJsonString();
                    break;
                }
            }

            await channelConfigurationService.Update(row);
            return ToChannelResponse(row, ch);
        }

        string GetPublicBaseUrl()
        {
            var baseUrl = configuration["ApplicationSettings:baseUrl"]
                ?? Environment.GetEnvironmentVariable("PUBLIC_API_BASE_URL")
                ?? "http://localhost:5050";
            return baseUrl.TrimEnd('/');
        }

        object ToChannelResponse(ChannelConfiguration row, string channel)
        {
            var json = GetChannelJson(row, channel.ToLowerInvariant());
            return JsonSerializer.Deserialize<object>(json.ToJsonString())!;
        }

        JsonObject GetChannelJson(ChannelConfiguration row, string channel)
        {
            var baseUrl = GetPublicBaseUrl();
            var stored = channel switch
            {
                "email" => ParseObject(row.emailconfig),
                "whatsapp" => ParseObject(row.whatsappconfig),
                "facebook" => ParseObject(row.facebookconfig),
                _ => ParseObject(row.smsconfig),
            };
            var defaults = channel switch
            {
                "email" => DefaultEmail(),
                "whatsapp" => DefaultWhatsapp(baseUrl),
                "facebook" => DefaultFacebook(baseUrl),
                _ => DefaultSms(),
            };
            return MergeChannelConfig(defaults, stored);
        }

        object ToResponse(ChannelConfiguration row)
        {
            var baseUrl = GetPublicBaseUrl();

            var whatsapp = MergeDefaults(row.whatsappconfig, new JsonObject { ["webhookUrl"] = $"{baseUrl}/webhooks/whatsapp" });
            var facebook = MergeDefaults(row.facebookconfig, new JsonObject { ["webhookUrl"] = $"{baseUrl}/webhooks/facebook" });

            return new
            {
                email = ParseObject(row.emailconfig),
                whatsapp = whatsapp,
                sms = ParseObject(row.smsconfig),
                facebook = facebook,
                googleApiKey = row.googleapikey ?? "",
            };
        }

        public static JsonObject ParseConfigObject(string? raw) => ParseObject(raw);

        static JsonObject ParseObject(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return new JsonObject();
            try
            {
                return JsonNode.Parse(raw)?.AsObject() ?? new JsonObject();
            }
            catch
            {
                return new JsonObject();
            }
        }

        static JsonObject MergeDefaults(string? raw, JsonObject extras)
        {
            var obj = ParseObject(raw);
            foreach (var kv in extras)
                obj[kv.Key] ??= kv.Value?.DeepClone();
            return obj;
        }

        static JsonObject MergeChannelConfig(JsonObject defaults, JsonObject stored)
        {
            var result = (JsonObject)defaults.DeepClone();
            foreach (var kv in stored)
            {
                if (kv.Value != null)
                    result[kv.Key] = kv.Value.DeepClone();
            }
            return result;
        }

        static JsonObject DefaultEmail() => new()
        {
            ["provider"] = "amazon_ses",
            ["region"] = "ap-south-1",
            ["accessKeyId"] = "",
            ["secretAccessKey"] = "",
            ["fromName"] = "",
            ["fromEmail"] = "",
            ["replyTo"] = "",
            ["configurationSet"] = "",
            ["domain"] = "",
            ["domainVerified"] = false,
            ["dkimVerified"] = false,
            ["spfVerified"] = false,
            ["dmarcPolicy"] = "none",
            ["sandboxMode"] = true,
            ["dailyQuota"] = 200,
            ["sendRate"] = 1,
        };

        static JsonObject DefaultWhatsapp(string baseUrl) => new()
        {
            ["provider"] = "meta_cloud_api",
            ["wabaId"] = "",
            ["phoneNumberId"] = "",
            ["displayPhoneNumber"] = "",
            ["businessName"] = "",
            ["accessToken"] = "",
            ["appSecret"] = "",
            ["verifyToken"] = "",
            ["webhookUrl"] = $"{baseUrl}/webhooks/whatsapp",
            ["qualityRating"] = "UNKNOWN",
            ["messagingLimit"] = "TIER_1K",
            ["verified"] = false,
            ["phoneRegistered"] = false,
            ["wabaSubscribed"] = false,
            ["registrationError"] = "",
            ["metaPhoneStatus"] = "",
            ["lastVerifiedAt"] = "",
        };

        static JsonObject DefaultFacebook(string baseUrl) => new()
        {
            ["provider"] = "meta_messenger",
            ["pageId"] = "",
            ["pageName"] = "",
            ["pageAccessToken"] = "",
            ["appSecret"] = "",
            ["verifyToken"] = "",
            ["webhookUrl"] = $"{baseUrl}/webhooks/facebook",
            ["verified"] = false,
        };

        static JsonObject DefaultSms() => new()
        {
            ["provider"] = "msg91",
            ["country"] = "IN",
            ["dltEnabled"] = false,
            ["principalEntityId"] = "",
            ["senderId"] = "",
            ["senderIdType"] = "Promotional",
            ["apiKey"] = "",
            ["route"] = "Promotional",
            ["tps"] = 10,
        };

        static string MergeJsonObject(string? raw, JsonElement patch)
        {
            var obj = ParseObject(raw);
            if (patch.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in patch.EnumerateObject())
                    obj[prop.Name] = JsonNode.Parse(prop.Value.GetRawText());
            }
            return obj.ToJsonString();
        }

        async Task<ChannelConfiguration> EnsureWebhookVerifyTokens(ChannelConfiguration row)
        {
            var changed = false;
            if (EnsureVerifyTokenInConfig(row.whatsappconfig, "wa", row.organizationid, out var waJson))
            {
                row.whatsappconfig = waJson;
                changed = true;
            }
            if (EnsureVerifyTokenInConfig(row.facebookconfig, "fb", row.organizationid, out var fbJson))
            {
                row.facebookconfig = fbJson;
                changed = true;
            }
            if (changed)
                await channelConfigurationService.Update(row);
            return row;
        }

        static bool EnsureVerifyTokenInConfig(string? json, string prefix, string? organizationId, out string updatedJson)
        {
            var obj = ParseObject(json);
            var existing = obj["verifyToken"]?.GetValue<string>()?.Trim();
            if (!string.IsNullOrEmpty(existing))
            {
                updatedJson = json ?? "{}";
                return false;
            }
            obj["verifyToken"] = NewWebhookVerifyToken(prefix, organizationId);
            updatedJson = obj.ToJsonString();
            return true;
        }

        internal static string NewWebhookVerifyToken(string prefix, string? organizationId)
        {
            var slug = (organizationId ?? "org").Replace("-", "", StringComparison.Ordinal).ToLowerInvariant();
            if (slug.Length > 10)
                slug = slug[..10];
            return $"{prefix}_verify_{slug}_{Guid.NewGuid():N}"[..32];
        }

        internal static string? ReadVerifyToken(string? configJson) =>
            ReadJsonString(configJson, "verifyToken");

        internal static string? ReadJsonString(string? configJson, string key)
        {
            var value = ParseObject(configJson)[key]?.GetValue<string>()?.Trim();
            return string.IsNullOrEmpty(value) ? null : value;
        }

        public static async Task<bool> MatchesAnyVerifyToken(
            ChannelConfigurationService channelConfigurationService,
            string? token,
            bool whatsApp)
        {
            if (string.IsNullOrWhiteSpace(token))
                return false;

            var rows = await channelConfigurationService.Select(new ChannelConfigurationSelectReq());
            foreach (var row in rows)
            {
                var raw = whatsApp ? row.whatsappconfig : row.facebookconfig;
                var vt = ReadVerifyToken(raw);
                if (vt != null && token == vt)
                    return true;
            }

            return false;
        }
    }
}
