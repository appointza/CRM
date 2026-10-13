using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class ApiKeyService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public ApiKeyService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<ApiKey>> Select(ApiKeySelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<ApiKey>> SelectTransaction(IDb db, ApiKeySelectReq req)
        {
            List<ApiKey> result = new List<ApiKey>();

            string query = @"
                SELECT
                    id, organization_id, label, prefix, key_hash, created_at, last_used
                FROM api_keys
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.label))
                qb.AddParameter("label", "=", "label", req.label, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.prefix))
                qb.AddParameter("prefix", "=", "prefix", req.prefix, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    ApiKey apiKey = new ApiKey();
                    apiKey.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    apiKey.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    apiKey.label = reader["label"] == DBNull.Value ? null : reader["label"]?.ToString();
                    apiKey.prefix = reader["prefix"] == DBNull.Value ? null : reader["prefix"]?.ToString();
                    apiKey.keyhash = reader["key_hash"] == DBNull.Value ? null : reader["key_hash"]?.ToString();
                    apiKey.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    apiKey.lastused = reader["last_used"] == DBNull.Value ? null : Convert.ToDateTime(reader["last_used"]);
                    result.Add(apiKey);
                }
            }

            return result;
        }

        public async Task<ApiKey> Insert(ApiKey apiKey)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, apiKey);
            }
            return apiKey;
        }

        public async Task InsertTransaction(IDb db, ApiKey apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey.id))
                apiKey.id = Guid.NewGuid().ToString();
            if (apiKey.createdat == null)
                apiKey.createdat = DateTime.UtcNow;

            string query = @"
                INSERT INTO api_keys (
                    id, organization_id, label, prefix, key_hash, created_at, last_used
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @label, @prefix, @key_hash, @created_at, @last_used
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(apiKey.id) ? DBNull.Value : apiKey.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(apiKey.organizationid) ? DBNull.Value : apiKey.organizationid;
            db.AddParameter(cmd, "label", DbTypes.Types.String).Value = (object)apiKey.label ?? DBNull.Value;
            db.AddParameter(cmd, "prefix", DbTypes.Types.String).Value = (object)apiKey.prefix ?? DBNull.Value;
            db.AddParameter(cmd, "key_hash", DbTypes.Types.String).Value = (object)apiKey.keyhash ?? DBNull.Value;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = apiKey.createdat.HasValue ? apiKey.createdat.Value : DBNull.Value;
            db.AddParameter(cmd, "last_used", DbTypes.Types.DateTime).Value = apiKey.lastused.HasValue ? apiKey.lastused.Value : DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<ApiKey> Update(ApiKey apiKey)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, apiKey);
            }
            return apiKey;
        }

        public async Task<bool> UpdateTransaction(IDb db, ApiKey apiKey)
        {
            string query = @"
                UPDATE api_keys
                SET
                    organization_id = @organization_id::uuid,
                    label = @label,
                    prefix = @prefix,
                    key_hash = @key_hash,
                    created_at = @created_at,
                    last_used = @last_used
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(apiKey.id) ? DBNull.Value : apiKey.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(apiKey.organizationid) ? DBNull.Value : apiKey.organizationid;
            db.AddParameter(cmd, "label", DbTypes.Types.String).Value = (object)apiKey.label ?? DBNull.Value;
            db.AddParameter(cmd, "prefix", DbTypes.Types.String).Value = (object)apiKey.prefix ?? DBNull.Value;
            db.AddParameter(cmd, "key_hash", DbTypes.Types.String).Value = (object)apiKey.keyhash ?? DBNull.Value;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = apiKey.createdat.HasValue ? apiKey.createdat.Value : DBNull.Value;
            db.AddParameter(cmd, "last_used", DbTypes.Types.DateTime).Value = apiKey.lastused.HasValue ? apiKey.lastused.Value : DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(ApiKeyDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, ApiKeyDeleteReq req)
        {
            string query = @"
                DELETE FROM api_keys
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
