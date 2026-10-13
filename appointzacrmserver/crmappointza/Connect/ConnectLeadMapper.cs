using System.Text.Json;
using CrmAppointza.Models.CrmAppointza;

namespace CrmAppointza.Connect
{
    public static class ConnectLeadMapper
    {
        public static Lead FromJsonBody(JsonElement body)
        {
            var lead = new Lead
            {
                name = GetString(body, "name"),
                phone = GetString(body, "phone"),
                email = GetString(body, "email"),
                facebookpsid = GetString(body, "facebookPsid"),
                businessname = GetString(body, "businessName"),
                ownername = GetString(body, "ownerName"),
                category = GetString(body, "category"),
                website = GetString(body, "website"),
                mapsurl = GetString(body, "mapsUrl"),
                address = GetString(body, "address"),
                pincode = GetString(body, "pinCode"),
                area = GetString(body, "area"),
                city = GetString(body, "city"),
                state = GetString(body, "state"),
                type = GetString(body, "type"),
                source = GetString(body, "source"),
            };

            if (body.TryGetProperty("tags", out var tagsEl))
            {
                lead.tags = tagsEl.ValueKind switch
                {
                    JsonValueKind.Array => tagsEl.GetRawText(),
                    JsonValueKind.String => tagsEl.GetString() ?? "[]",
                    _ => "[]",
                };
            }

            return lead;
        }

        public static List<LeadPlaceImportRow> PlaceImportRowsFromBody(JsonElement body)
        {
            if (!body.TryGetProperty("places", out var arr) || arr.ValueKind != JsonValueKind.Array)
                throw new Utils.AppException(Utils.AppException.ErrorCodes.BadRequest, "places must be an array");

            var list = new List<LeadPlaceImportRow>();
            foreach (var item in arr.EnumerateArray())
            {
                list.Add(new LeadPlaceImportRow
                {
                    placeId = GetString(item, "placeId"),
                    lead = FromJsonBody(item),
                });
            }
            return list;
        }

        public static List<Lead> LeadArrayFromBulkBody(JsonElement body)
        {
            JsonElement arr;
            if (body.TryGetProperty("leads", out var leadsProp) && leadsProp.ValueKind == JsonValueKind.Array)
                arr = leadsProp;
            else if (body.TryGetProperty("items", out var itemsProp) && itemsProp.ValueKind == JsonValueKind.Array)
                arr = itemsProp;
            else
                throw new Utils.AppException(Utils.AppException.ErrorCodes.BadRequest, "leads must be an array");

            var list = new List<Lead>();
            foreach (var item in arr.EnumerateArray())
                list.Add(FromJsonBody(item));
            return list;
        }

        static string GetString(JsonElement body, string prop)
        {
            if (!body.TryGetProperty(prop, out var el))
                return "";
            return el.ValueKind == JsonValueKind.String ? el.GetString() ?? "" : el.ToString();
        }
    }
}
