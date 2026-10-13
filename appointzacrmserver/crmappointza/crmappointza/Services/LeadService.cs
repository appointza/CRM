using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;
using System.Text.Json;

namespace CrmAppointza.Services.CrmAppointza
{
    public class LeadService
    {
        /// <summary>0 = unknown, 1 = includes facebook_psid, 2 = legacy leads table without facebook_psid.</summary>
        static int leadFacebookPsidColumnMode;

        static readonly Dictionary<string, List<string>> FallbackTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["lead"] = new List<string> { "prospect", "call", "loss" },
            ["prospect"] = new List<string> { "call", "customer", "loss" },
            ["call"] = new List<string> { "prospect", "customer", "loss" },
            ["customer"] = new List<string> { "discontinued", "loss" },
            ["discontinued"] = new List<string> { "customer", "loss" },
            ["loss"] = new List<string>(),
        };

        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;
        ReferenceValueService referenceValueService;

        public LeadService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate,
            ReferenceValueService referenceValueService)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
            this.referenceValueService = referenceValueService;
        }

        public async Task<List<Lead>> Select(LeadSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        static async Task<int> ResolveFacebookPsidMode(IDb db)
        {
            if (leadFacebookPsidColumnMode != 0)
                return leadFacebookPsidColumnMode;
            try
            {
                var cmd = db.GetCommand(@"
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'facebook_psid'
                    LIMIT 1;
                ");
                using var reader = await db.Execute(cmd);
                leadFacebookPsidColumnMode = await reader.ReadAsync() ? 1 : 2;
            }
            catch
            {
                leadFacebookPsidColumnMode = 2;
            }
            return leadFacebookPsidColumnMode;
        }

        public async Task<List<Lead>> SelectTransaction(IDb db, LeadSelectReq req)
        {
            List<Lead> result = new List<Lead>();
            var fbMode = await ResolveFacebookPsidMode(db);
            string fbCol = fbMode == 1 ? "facebook_psid," : "";

            string query = $@"
                SELECT
                    id, organization_id, name, phone, email, {fbCol} business_name, owner_name, category, website, maps_url, address, pin_code, area, city, state, type, tags, notes, stage_history, created_at, source
                FROM leads
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.name))
                qb.AddParameter("name", "=", "name", req.name, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.email))
                qb.AddParameter("email", "=", "email", req.email, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.phone))
                qb.AddParameter("phone", "=", "phone", req.phone, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.source))
                qb.AddParameter("source", "=", "source", req.source, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    Lead lead = new Lead();
                    lead.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    lead.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    lead.name = reader["name"] == DBNull.Value ? null : reader["name"]?.ToString();
                    lead.phone = reader["phone"] == DBNull.Value ? null : reader["phone"]?.ToString();
                    lead.email = reader["email"] == DBNull.Value ? null : reader["email"]?.ToString();
                    if (fbMode == 1)
                        lead.facebookpsid = reader["facebook_psid"] == DBNull.Value ? null : reader["facebook_psid"]?.ToString();
                    lead.businessname = reader["business_name"] == DBNull.Value ? null : reader["business_name"]?.ToString();
                    lead.ownername = reader["owner_name"] == DBNull.Value ? null : reader["owner_name"]?.ToString();
                    lead.category = reader["category"] == DBNull.Value ? null : reader["category"]?.ToString();
                    lead.website = reader["website"] == DBNull.Value ? null : reader["website"]?.ToString();
                    lead.mapsurl = reader["maps_url"] == DBNull.Value ? null : reader["maps_url"]?.ToString();
                    lead.address = reader["address"] == DBNull.Value ? null : reader["address"]?.ToString();
                    lead.pincode = reader["pin_code"] == DBNull.Value ? null : reader["pin_code"]?.ToString();
                    lead.area = reader["area"] == DBNull.Value ? null : reader["area"]?.ToString();
                    lead.city = reader["city"] == DBNull.Value ? null : reader["city"]?.ToString();
                    lead.state = reader["state"] == DBNull.Value ? null : reader["state"]?.ToString();
                    lead.type = reader["type"] == DBNull.Value ? null : reader["type"]?.ToString();
                    lead.tags = reader["tags"] == DBNull.Value ? null : reader["tags"]?.ToString();
                    lead.notes = reader["notes"] == DBNull.Value ? null : reader["notes"]?.ToString();
                    lead.stagehistory = reader["stage_history"] == DBNull.Value ? null : reader["stage_history"]?.ToString();
                    lead.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    lead.source = reader["source"] == DBNull.Value ? null : reader["source"]?.ToString();
                    result.Add(lead);
                }
            }

            return result;
        }

        public async Task<Lead> Insert(Lead lead)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, lead);
            }
            return lead;
        }

        public async Task InsertTransaction(IDb db, Lead lead)
        {
            if (string.IsNullOrWhiteSpace(lead.id))
                lead.id = Guid.NewGuid().ToString();
            if (lead.createdat == null)
                lead.createdat = DateTime.UtcNow.Date;

            var fbMode = await ResolveFacebookPsidMode(db);
            string fbInsertCol = fbMode == 1 ? "facebook_psid, " : "";
            string fbInsertVal = fbMode == 1 ? "@facebook_psid, " : "";

            string query = $@"
                INSERT INTO leads (
                    id, organization_id, name, phone, email, {fbInsertCol}business_name, owner_name, category, website, maps_url, address, pin_code, area, city, state, type, tags, notes, stage_history, created_at, source
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @name, @phone, @email, {fbInsertVal}@business_name, @owner_name, @category, @website, @maps_url, @address, @pin_code, @area, @city, @state, @type, @tags::jsonb, @notes::jsonb, @stage_history::jsonb, @created_at::date, @source
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.id) ? DBNull.Value : lead.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.organizationid) ? DBNull.Value : lead.organizationid;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)lead.name ?? DBNull.Value;
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = (object)lead.phone ?? DBNull.Value;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = (object)lead.email ?? DBNull.Value;
            if (fbMode == 1)
                db.AddParameter(cmd, "facebook_psid", DbTypes.Types.String).Value = (object)lead.facebookpsid ?? DBNull.Value;
            db.AddParameter(cmd, "business_name", DbTypes.Types.String).Value = (object)lead.businessname ?? DBNull.Value;
            db.AddParameter(cmd, "owner_name", DbTypes.Types.String).Value = (object)lead.ownername ?? DBNull.Value;
            db.AddParameter(cmd, "category", DbTypes.Types.String).Value = (object)lead.category ?? DBNull.Value;
            db.AddParameter(cmd, "website", DbTypes.Types.String).Value = (object)lead.website ?? DBNull.Value;
            db.AddParameter(cmd, "maps_url", DbTypes.Types.String).Value = (object)lead.mapsurl ?? DBNull.Value;
            db.AddParameter(cmd, "address", DbTypes.Types.String).Value = (object)lead.address ?? DBNull.Value;
            db.AddParameter(cmd, "pin_code", DbTypes.Types.String).Value = (object)lead.pincode ?? DBNull.Value;
            db.AddParameter(cmd, "area", DbTypes.Types.String).Value = (object)lead.area ?? DBNull.Value;
            db.AddParameter(cmd, "city", DbTypes.Types.String).Value = (object)lead.city ?? DBNull.Value;
            db.AddParameter(cmd, "state", DbTypes.Types.String).Value = (object)lead.state ?? DBNull.Value;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = (object)lead.type ?? DBNull.Value;
            db.AddParameter(cmd, "tags", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.tags) ? "[]" : lead.tags;
            db.AddParameter(cmd, "notes", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.notes) ? "[]" : lead.notes;
            db.AddParameter(cmd, "stage_history", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.stagehistory) ? "[]" : lead.stagehistory;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = lead.createdat.HasValue ? lead.createdat.Value.Date : DBNull.Value;
            db.AddParameter(cmd, "source", DbTypes.Types.String).Value = (object)lead.source ?? DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<Lead> Update(Lead lead)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, lead);
            }
            return lead;
        }

        public async Task<bool> UpdateTransaction(IDb db, Lead lead)
        {
            var fbMode = await ResolveFacebookPsidMode(db);
            string fbSet = fbMode == 1 ? "facebook_psid = @facebook_psid," : "";

            string query = $@"
                UPDATE leads
                SET
                    organization_id = @organization_id::uuid,
                    name = @name,
                    phone = @phone,
                    email = @email,
                    {fbSet}
                    business_name = @business_name,
                    owner_name = @owner_name,
                    category = @category,
                    website = @website,
                    maps_url = @maps_url,
                    address = @address,
                    pin_code = @pin_code,
                    area = @area,
                    city = @city,
                    state = @state,
                    type = @type,
                    tags = @tags::jsonb,
                    notes = @notes::jsonb,
                    stage_history = @stage_history::jsonb,
                    created_at = @created_at,
                    source = @source
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.id) ? DBNull.Value : lead.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.organizationid) ? DBNull.Value : lead.organizationid;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)lead.name ?? DBNull.Value;
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = (object)lead.phone ?? DBNull.Value;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = (object)lead.email ?? DBNull.Value;
            if (fbMode == 1)
                db.AddParameter(cmd, "facebook_psid", DbTypes.Types.String).Value = (object)lead.facebookpsid ?? DBNull.Value;
            db.AddParameter(cmd, "business_name", DbTypes.Types.String).Value = (object)lead.businessname ?? DBNull.Value;
            db.AddParameter(cmd, "owner_name", DbTypes.Types.String).Value = (object)lead.ownername ?? DBNull.Value;
            db.AddParameter(cmd, "category", DbTypes.Types.String).Value = (object)lead.category ?? DBNull.Value;
            db.AddParameter(cmd, "website", DbTypes.Types.String).Value = (object)lead.website ?? DBNull.Value;
            db.AddParameter(cmd, "maps_url", DbTypes.Types.String).Value = (object)lead.mapsurl ?? DBNull.Value;
            db.AddParameter(cmd, "address", DbTypes.Types.String).Value = (object)lead.address ?? DBNull.Value;
            db.AddParameter(cmd, "pin_code", DbTypes.Types.String).Value = (object)lead.pincode ?? DBNull.Value;
            db.AddParameter(cmd, "area", DbTypes.Types.String).Value = (object)lead.area ?? DBNull.Value;
            db.AddParameter(cmd, "city", DbTypes.Types.String).Value = (object)lead.city ?? DBNull.Value;
            db.AddParameter(cmd, "state", DbTypes.Types.String).Value = (object)lead.state ?? DBNull.Value;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = (object)lead.type ?? DBNull.Value;
            db.AddParameter(cmd, "tags", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.tags) ? "[]" : lead.tags;
            db.AddParameter(cmd, "notes", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.notes) ? "[]" : lead.notes;
            db.AddParameter(cmd, "stage_history", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(lead.stagehistory) ? "[]" : lead.stagehistory;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = lead.createdat.HasValue ? lead.createdat.Value.Date : DBNull.Value;
            db.AddParameter(cmd, "source", DbTypes.Types.String).Value = (object)lead.source ?? DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(LeadDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, LeadDeleteReq req)
        {
            string query = @"
                DELETE FROM leads
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<Lead?> GetById(string id)
        {
            var rows = await Select(new LeadSelectReq { id = id });
            return rows.FirstOrDefault();
        }

        public async Task<Lead> InsertWithConnectDefaults(string organizationId, Lead input)
        {
            var type = string.IsNullOrWhiteSpace(input.type) ? "lead" : input.type;
            var now = DateTime.UtcNow.ToString("o");
            var stage = JsonSerializer.Serialize(new[]
            {
                new Dictionary<string, object?>
                {
                    ["from"] = null,
                    ["to"] = type,
                    ["at"] = now,
                }
            });

            input.organizationid = organizationId;
            input.type = type;
            input.source = string.IsNullOrWhiteSpace(input.source) ? "manual" : input.source;
            input.tags = string.IsNullOrWhiteSpace(input.tags) ? "[]" : input.tags;
            input.notes = "[]";
            input.stagehistory = stage;
            input.createdat = DateTime.UtcNow;
            return await Insert(input);
        }

        public async Task<LeadBulkInsertRes> BulkInsertWithConnectDefaults(string organizationId, List<Lead> items)
        {
            var res = new LeadBulkInsertRes { ok = true };
            for (int i = 0; i < items.Count; i++)
            {
                try
                {
                    var row = await InsertWithConnectDefaults(organizationId, items[i]);
                    res.leads.Add(row);
                }
                catch (Exception ex)
                {
                    res.errors.Add(new { index = i + 1, message = ex.Message });
                }
            }
            res.created = res.leads.Count;
            res.failed = res.errors.Count;
            return res;
        }

        static string NormalizePhoneDigits(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return "";
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            return digits.Length > 10 ? digits[^10..] : digits;
        }

        static string NormalizeMapsUrl(string? url)
        {
            return (url ?? "").Trim().ToLowerInvariant();
        }

        public Lead? FindDuplicateForOrg(List<Lead> existing, Lead candidate)
        {
            var phone = NormalizePhoneDigits(candidate.phone);
            var maps = NormalizeMapsUrl(candidate.mapsurl);
            foreach (var e in existing)
            {
                if (phone.Length >= 8 && NormalizePhoneDigits(e.phone) == phone)
                    return e;
                var em = NormalizeMapsUrl(e.mapsurl);
                if (!string.IsNullOrEmpty(maps) && !string.IsNullOrEmpty(em) && em == maps)
                    return e;
            }
            return null;
        }

        public async Task<LeadImportFromPlacesRes> ImportFromPlaces(string organizationId, List<LeadPlaceImportRow> rows)
        {
            var res = new LeadImportFromPlacesRes();
            if (rows.Count > 200)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Maximum 200 places per save");

            var existing = await Select(new LeadSelectReq { organizationid = organizationId });

            foreach (var row in rows)
            {
                var input = row.lead ?? new Lead();
                if (string.IsNullOrWhiteSpace(input.name) && string.IsNullOrWhiteSpace(input.businessname))
                {
                    res.skipped++;
                    res.items.Add(new
                    {
                        placeId = row.placeId,
                        status = "skipped",
                        reason = "missing_name",
                    });
                    continue;
                }

                input.source = string.IsNullOrWhiteSpace(input.source) ? "google_maps" : input.source;

                var dup = FindDuplicateForOrg(existing, input);
                if (dup != null)
                {
                    res.skipped++;
                    res.items.Add(new
                    {
                        placeId = row.placeId,
                        status = "skipped",
                        reason = "duplicate",
                        leadId = dup.id,
                    });
                    continue;
                }

                try
                {
                    var created = await InsertWithConnectDefaults(organizationId, input);
                    existing.Add(created);
                    res.created++;
                    res.items.Add(new
                    {
                        placeId = row.placeId,
                        status = "created",
                        leadId = created.id,
                    });
                }
                catch (Exception ex)
                {
                    res.skipped++;
                    res.items.Add(new
                    {
                        placeId = row.placeId,
                        status = "error",
                        reason = ex.Message,
                    });
                }
            }

            return res;
        }

        public async Task<Lead> Transition(string leadId, string toType, string? reason, string? byUserId)
        {
            var lead = await GetById(leadId) ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Lead not found.");
            var from = string.IsNullOrWhiteSpace(lead.type) ? "lead" : lead.type;
            if (string.Equals(from, toType, StringComparison.OrdinalIgnoreCase))
                return lead;

            var transitions = await referenceValueService.GetStageTransitions(lead.organizationid);
            var allowedMap = transitions.Count > 0 ? transitions : FallbackTransitions;
            if (!allowedMap.TryGetValue(from, out var allowed) || !allowed.Contains(toType, StringComparer.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.BadRequest, $"Cannot move from \"{from}\" to \"{toType}\".");

            lead.type = toType;
            var history = string.IsNullOrWhiteSpace(lead.stagehistory)
                ? new List<JsonElement>()
                : JsonSerializer.Deserialize<List<JsonElement>>(lead.stagehistory) ?? new List<JsonElement>();

            var ev = JsonSerializer.SerializeToElement(new Dictionary<string, object?>
            {
                ["from"] = from,
                ["to"] = toType,
                ["at"] = DateTime.UtcNow.ToString("o"),
                ["reason"] = string.IsNullOrWhiteSpace(reason) ? null : reason,
                ["byUserId"] = string.IsNullOrWhiteSpace(byUserId) ? null : byUserId,
            });
            history.Add(ev);
            lead.stagehistory = JsonSerializer.Serialize(history);
            await Update(lead);
            return lead;
        }

        public async Task<Lead> AddNote(string leadId, string text, string? byUserId)
        {
            var body = (text ?? "").Trim();
            if (body.Length == 0)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Note cannot be empty.");

            var lead = await GetById(leadId) ?? throw new AppException(AppException.ErrorCodes.BadRequest, "Lead not found.");
            var notes = string.IsNullOrWhiteSpace(lead.notes)
                ? new List<JsonElement>()
                : JsonSerializer.Deserialize<List<JsonElement>>(lead.notes) ?? new List<JsonElement>();

            var note = JsonSerializer.SerializeToElement(new Dictionary<string, object?>
            {
                ["id"] = $"ln_{Guid.NewGuid().ToString("N")[..8]}",
                ["at"] = DateTime.UtcNow.ToString("o"),
                ["text"] = body,
                ["byUserId"] = string.IsNullOrWhiteSpace(byUserId) ? null : byUserId,
            });
            notes.Add(note);
            lead.notes = JsonSerializer.Serialize(notes);
            await Update(lead);
            return lead;
        }
    }
}
