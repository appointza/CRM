using System.Text.Json;
using CrmAppointza.Services.CrmAppointza;
using CrmAppointza.Utils;

namespace CrmAppointza.Connect
{
    public class ConnectGooglePlacesService
    {
        readonly ChannelConfigurationService channelConfigurationService;
        readonly IHttpClientFactory httpClientFactory;

        public ConnectGooglePlacesService(
            ChannelConfigurationService channelConfigurationService,
            IHttpClientFactory httpClientFactory)
        {
            this.channelConfigurationService = channelConfigurationService;
            this.httpClientFactory = httpClientFactory;
        }

        public async Task<object> Search(string organizationId, string? query, string? lat, string? lng)
        {
            var q = query?.Trim() ?? "";
            if (q.Length < 2)
                return new { results = Array.Empty<object>() };

            var key = await GetApiKey(organizationId);
            if (string.IsNullOrEmpty(key))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Google API key is not configured. Add it in Settings → Google Maps.");

            var searchQuery = q;
            var hasLat = double.TryParse(lat, out var latN);
            var hasLng = double.TryParse(lng, out var lngN);
            var hasLocation = hasLat && hasLng;
            if (hasLocation && searchQuery.Contains("near me", StringComparison.OrdinalIgnoreCase))
            {
                searchQuery = System.Text.RegularExpressions.Regex.Replace(
                    searchQuery,
                    "(?i)\\bnear me\\b",
                    "").Trim();
                if (searchQuery.Length < 2)
                    searchQuery = "business";
            }

            var client = httpClientFactory.CreateClient();
            var url =
                "https://maps.googleapis.com/maps/api/place/textsearch/json?" +
                $"query={Uri.EscapeDataString(searchQuery)}&key={Uri.EscapeDataString(key)}";
            if (hasLocation)
                url += $"&location={latN.ToString(System.Globalization.CultureInfo.InvariantCulture)},{lngN.ToString(System.Globalization.CultureInfo.InvariantCulture)}&radius=50000";

            using var res = await client.GetAsync(url);
            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;
            if (status != "OK" && status != "ZERO_RESULTS")
            {
                var err = root.TryGetProperty("error_message", out var em) ? em.GetString() : status;
                throw new AppException(AppException.ErrorCodes.BadRequest, err ?? "Places search failed");
            }

            var list = new List<object>();
            if (root.TryGetProperty("results", out var results))
            {
                foreach (var item in results.EnumerateArray().Take(20))
                {
                    var placeId = item.TryGetProperty("place_id", out var pid) ? pid.GetString() : "";
                    var name = item.TryGetProperty("name", out var n) ? n.GetString() : "";
                    var address = item.TryGetProperty("formatted_address", out var fa) ? fa.GetString() : "";
                    double? plat = null, plng = null;
                    if (item.TryGetProperty("geometry", out var geo) &&
                        geo.TryGetProperty("location", out var loc))
                    {
                        if (loc.TryGetProperty("lat", out var la)) plat = la.GetDouble();
                        if (loc.TryGetProperty("lng", out var lo)) plng = lo.GetDouble();
                    }
                    double? rating = item.TryGetProperty("rating", out var rt) ? rt.GetDouble() : null;
                    int? userRatingsTotal = item.TryGetProperty("user_ratings_total", out var ur) && ur.TryGetInt32(out var urv)
                        ? urv
                        : null;
                    var businessStatus = item.TryGetProperty("business_status", out var bs) ? bs.GetString() : "";
                    bool? openNow = null;
                    if (item.TryGetProperty("opening_hours", out var oh) &&
                        oh.TryGetProperty("open_now", out var on))
                        openNow = on.GetBoolean();
                    string category = "";
                    if (item.TryGetProperty("types", out var types) && types.GetArrayLength() > 0)
                        category = FormatPlaceType(types[0].GetString());

                    list.Add(new
                    {
                        placeId,
                        name,
                        address,
                        lat = plat,
                        lng = plng,
                        rating,
                        userRatingsTotal,
                        category,
                        businessStatus,
                        openNow,
                    });
                }
            }

            return new { results = list };
        }

        public async Task<object> PlaceDetails(string organizationId, string placeId)
        {
            var id = placeId?.Trim() ?? "";
            if (string.IsNullOrEmpty(id))
                throw new AppException(AppException.ErrorCodes.BadRequest, "placeId is required");

            var key = await GetApiKey(organizationId);
            if (string.IsNullOrEmpty(key))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Google API key is not configured. Add it in Settings → Google Maps.");

            const string fields =
                "name,formatted_address,formatted_phone_number,international_phone_number,website,url,address_components,geometry";
            var url =
                "https://maps.googleapis.com/maps/api/place/details/json?" +
                $"place_id={Uri.EscapeDataString(id)}&fields={fields}&key={Uri.EscapeDataString(key)}";

            var client = httpClientFactory.CreateClient();
            using var res = await client.GetAsync(url);
            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;
            if (status != "OK")
            {
                var err = root.TryGetProperty("error_message", out var em) ? em.GetString() : status;
                throw new AppException(AppException.ErrorCodes.BadRequest, err ?? "Place details failed");
            }

            if (!root.TryGetProperty("result", out var r))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Place not found");

            var name = r.TryGetProperty("name", out var n) ? n.GetString() : "";
            var address = r.TryGetProperty("formatted_address", out var fa) ? fa.GetString() : "";
            var phone = r.TryGetProperty("international_phone_number", out var ip) && ip.GetString() is { Length: > 0 } iph
                ? iph
                : r.TryGetProperty("formatted_phone_number", out var fp) ? fp.GetString() : "";
            var website = r.TryGetProperty("website", out var w) ? w.GetString() : "";
            var mapsUrl = r.TryGetProperty("url", out var u) ? u.GetString() : "";
            double? lat = null, lng = null;
            if (r.TryGetProperty("geometry", out var geo) && geo.TryGetProperty("location", out var loc))
            {
                if (loc.TryGetProperty("lat", out var la)) lat = la.GetDouble();
                if (loc.TryGetProperty("lng", out var lo)) lng = lo.GetDouble();
            }

            string pinCode = "", city = "", state = "", area = "";
            if (r.TryGetProperty("address_components", out var comps))
            {
                foreach (var c in comps.EnumerateArray())
                {
                    if (!c.TryGetProperty("types", out var types))
                        continue;
                    var longName = c.TryGetProperty("long_name", out var ln) ? ln.GetString() : "";
                    var typeList = types.EnumerateArray().Select(t => t.GetString()).Where(x => x != null).ToHashSet(StringComparer.Ordinal);
                    if (typeList.Contains("postal_code")) pinCode = longName ?? pinCode;
                    if (typeList.Contains("locality")) city = longName ?? city;
                    if (typeList.Contains("administrative_area_level_1")) state = longName ?? state;
                    if (typeList.Contains("sublocality") || typeList.Contains("sublocality_level_1"))
                        area = longName ?? area;
                }
            }

            return new
            {
                placeId = id,
                name,
                businessName = name,
                address,
                phone,
                website,
                mapsUrl,
                pinCode,
                city,
                state,
                area,
                lat,
                lng,
                embedUrl = string.IsNullOrEmpty(key)
                    ? null
                    : $"https://www.google.com/maps/embed/v1/place?key={Uri.EscapeDataString(key)}&q=place_id:{Uri.EscapeDataString(id)}",
            };
        }

        public async Task<object> MapsClientConfig(string organizationId)
        {
            var key = await GetApiKey(organizationId);
            return new
            {
                configured = !string.IsNullOrEmpty(key),
                apiKey = key ?? "",
            };
        }

        public async Task<object> Geocode(string organizationId, string? address)
        {
            var q = address?.Trim() ?? "";
            if (q.Length < 3)
                throw new AppException(AppException.ErrorCodes.BadRequest, "address is required");

            var key = await GetApiKey(organizationId);
            if (string.IsNullOrEmpty(key))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Google API key is not configured. Add it in Settings → Google Maps.");

            var client = httpClientFactory.CreateClient();
            var url =
                "https://maps.googleapis.com/maps/api/geocode/json?" +
                $"address={Uri.EscapeDataString(q)}&key={Uri.EscapeDataString(key)}";

            using var res = await client.GetAsync(url);
            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;
            if (status != "OK")
            {
                var err = root.TryGetProperty("error_message", out var em) ? em.GetString() : status;
                throw new AppException(AppException.ErrorCodes.BadRequest, err ?? "Geocoding failed");
            }

            if (!root.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Address not found");

            var first = results[0];
            var formatted = first.TryGetProperty("formatted_address", out var fa) ? fa.GetString() : q;
            double? lat = null, lng = null;
            if (first.TryGetProperty("geometry", out var geo) && geo.TryGetProperty("location", out var loc))
            {
                if (loc.TryGetProperty("lat", out var la)) lat = la.GetDouble();
                if (loc.TryGetProperty("lng", out var lo)) lng = lo.GetDouble();
            }

            return new { formattedAddress = formatted, lat, lng };
        }

        async Task<string?> GetApiKey(string organizationId)
        {
            var row = await channelConfigurationService.EnsureForOrganization(organizationId);
            var key = row.googleapikey?.Trim();
            return string.IsNullOrEmpty(key) ? null : key;
        }

        static string FormatPlaceType(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "";
            var s = raw.Replace('_', ' ').Trim();
            if (s.Length == 0) return "";
            return char.ToUpperInvariant(s[0]) + (s.Length > 1 ? s[1..] : "");
        }
    }
}
