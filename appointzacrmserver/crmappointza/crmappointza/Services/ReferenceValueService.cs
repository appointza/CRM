using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class ReferenceValueService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public ReferenceValueService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<ReferenceValue>> Select(ReferenceValueSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<ReferenceValue>> SelectTransaction(IDb db, ReferenceValueSelectReq req)
        {
            List<ReferenceValue> result = new List<ReferenceValue>();

            string query = @"
                SELECT
                    id, organization_id, code, reference_value, reference_code, color_code, month_count, created_at, category
                FROM reference_values
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.code))
                qb.AddParameter("code", "=", "code", req.code, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.category))
                qb.AddParameter("category", "=", "category", req.category, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.referencecode))
                qb.AddParameter("reference_code", "=", "referencecode", req.referencecode, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    ReferenceValue referenceValue = new ReferenceValue();
                    referenceValue.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    referenceValue.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    referenceValue.code = reader["code"] == DBNull.Value ? null : reader["code"]?.ToString();
                    referenceValue.referencevalue = reader["reference_value"] == DBNull.Value ? null : reader["reference_value"]?.ToString();
                    referenceValue.referencecode = reader["reference_code"] == DBNull.Value ? null : reader["reference_code"]?.ToString();
                    referenceValue.colorcode = reader["color_code"] == DBNull.Value ? null : reader["color_code"]?.ToString();
                    referenceValue.monthcount = reader["month_count"] == DBNull.Value ? null : Convert.ToInt32(reader["month_count"]);
                    referenceValue.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    referenceValue.category = reader["category"] == DBNull.Value ? null : reader["category"]?.ToString();
                    result.Add(referenceValue);
                }
            }

            return result;
        }

        public async Task<ReferenceValue> Insert(ReferenceValue referenceValue)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, referenceValue);
            }
            return referenceValue;
        }

        public async Task InsertTransaction(IDb db, ReferenceValue referenceValue)
        {
            if (string.IsNullOrWhiteSpace(referenceValue.id))
                referenceValue.id = Guid.NewGuid().ToString();
            if (referenceValue.createdat == null)
                referenceValue.createdat = DateTime.UtcNow;

            string query = @"
                INSERT INTO reference_values (
                    id, organization_id, code, reference_value, reference_code, color_code, month_count, created_at, category
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @code, @reference_value, @reference_code, @color_code, @month_count, @created_at, @category
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(referenceValue.id) ? DBNull.Value : referenceValue.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(referenceValue.organizationid) ? DBNull.Value : referenceValue.organizationid;
            db.AddParameter(cmd, "code", DbTypes.Types.String).Value = (object)referenceValue.code ?? DBNull.Value;
            db.AddParameter(cmd, "reference_value", DbTypes.Types.String).Value = (object)referenceValue.referencevalue ?? DBNull.Value;
            db.AddParameter(cmd, "reference_code", DbTypes.Types.String).Value = (object)referenceValue.referencecode ?? DBNull.Value;
            db.AddParameter(cmd, "color_code", DbTypes.Types.String).Value = (object)referenceValue.colorcode ?? DBNull.Value;
            db.AddParameter(cmd, "month_count", DbTypes.Types.Integer).Value = referenceValue.monthcount.HasValue ? referenceValue.monthcount.Value : DBNull.Value;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = referenceValue.createdat.HasValue ? referenceValue.createdat.Value : DBNull.Value;
            db.AddParameter(cmd, "category", DbTypes.Types.String).Value = (object)referenceValue.category ?? DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<ReferenceValue> Update(ReferenceValue referenceValue)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, referenceValue);
            }
            return referenceValue;
        }

        public async Task<bool> UpdateTransaction(IDb db, ReferenceValue referenceValue)
        {
            string query = @"
                UPDATE reference_values
                SET
                    organization_id = @organization_id::uuid,
                    code = @code,
                    reference_value = @reference_value,
                    reference_code = @reference_code,
                    color_code = @color_code,
                    month_count = @month_count,
                    created_at = @created_at,
                    category = @category
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(referenceValue.id) ? DBNull.Value : referenceValue.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(referenceValue.organizationid) ? DBNull.Value : referenceValue.organizationid;
            db.AddParameter(cmd, "code", DbTypes.Types.String).Value = (object)referenceValue.code ?? DBNull.Value;
            db.AddParameter(cmd, "reference_value", DbTypes.Types.String).Value = (object)referenceValue.referencevalue ?? DBNull.Value;
            db.AddParameter(cmd, "reference_code", DbTypes.Types.String).Value = (object)referenceValue.referencecode ?? DBNull.Value;
            db.AddParameter(cmd, "color_code", DbTypes.Types.String).Value = (object)referenceValue.colorcode ?? DBNull.Value;
            db.AddParameter(cmd, "month_count", DbTypes.Types.Integer).Value = referenceValue.monthcount.HasValue ? referenceValue.monthcount.Value : DBNull.Value;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = referenceValue.createdat.HasValue ? referenceValue.createdat.Value : DBNull.Value;
            db.AddParameter(cmd, "category", DbTypes.Types.String).Value = (object)referenceValue.category ?? DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(ReferenceValueDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, ReferenceValueDeleteReq req)
        {
            string query = @"
                DELETE FROM reference_values
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task SeedDefaultsIfMissing(string organizationId)
        {
            if (string.IsNullOrWhiteSpace(organizationId))
                return;

            var existing = await Select(new ReferenceValueSelectReq { organizationid = organizationId });
            bool hasStage = existing.Any(r => r.category == ReferenceValueDefaults.CategoryLeadStage);
            bool hasSource = existing.Any(r => r.category == ReferenceValueDefaults.CategoryLeadSource);
            var codes = new HashSet<string>(existing.Select(r => r.code ?? ""), StringComparer.OrdinalIgnoreCase);

            foreach (var seed in ReferenceValueDefaults.SeedRows)
            {
                if (seed.category == ReferenceValueDefaults.CategoryLeadStage && hasStage)
                    continue;
                if (seed.category == ReferenceValueDefaults.CategoryLeadSource && hasSource)
                    continue;
                if (codes.Contains(seed.code))
                    continue;

                await Insert(new ReferenceValue
                {
                    organizationid = organizationId,
                    code = seed.code,
                    category = seed.category,
                    referencevalue = seed.referencevalue,
                    referencecode = seed.referencecode,
                    colorcode = seed.colorcode,
                    monthcount = 0,
                    createdat = DateTime.UtcNow,
                });
                codes.Add(seed.code);
            }
        }

        public async Task<Dictionary<string, List<string>>> GetStageTransitions(string organizationId)
        {
            await SeedDefaultsIfMissing(organizationId);
            var rows = await Select(new ReferenceValueSelectReq
            {
                organizationid = organizationId,
                category = ReferenceValueDefaults.CategoryLeadStage,
            });

            var map = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
            foreach (var row in rows)
            {
                var next = (row.referencecode ?? "")
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();
                map[row.code ?? ""] = next;
            }
            return map;
        }
    }
}
