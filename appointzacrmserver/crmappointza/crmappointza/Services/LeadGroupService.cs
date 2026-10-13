using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class LeadGroupService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public LeadGroupService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<LeadGroup>> Select(LeadGroupSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<LeadGroup>> SelectTransaction(IDb db, LeadGroupSelectReq req)
        {
            List<LeadGroup> result = new List<LeadGroup>();

            string query = @"
                SELECT
                    id, organization_id, name, lead_ids, created_at
                FROM lead_groups
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.name))
                qb.AddParameter("name", "=", "name", req.name, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    LeadGroup leadGroup = new LeadGroup();
                    leadGroup.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    leadGroup.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    leadGroup.name = reader["name"] == DBNull.Value ? null : reader["name"]?.ToString();
                    leadGroup.leadids = reader["lead_ids"] == DBNull.Value ? null : reader["lead_ids"]?.ToString();
                    leadGroup.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    result.Add(leadGroup);
                }
            }

            return result;
        }

        public async Task<LeadGroup> Insert(LeadGroup leadGroup)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, leadGroup);
            }
            return leadGroup;
        }

        public async Task InsertTransaction(IDb db, LeadGroup leadGroup)
        {
            if (string.IsNullOrWhiteSpace(leadGroup.id))
                leadGroup.id = Guid.NewGuid().ToString();
            if (leadGroup.createdat == null)
                leadGroup.createdat = DateTime.UtcNow;

            string query = @"
                INSERT INTO lead_groups (
                    id, organization_id, name, lead_ids, created_at
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @name, @lead_ids::jsonb, @created_at
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(leadGroup.id) ? DBNull.Value : leadGroup.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(leadGroup.organizationid) ? DBNull.Value : leadGroup.organizationid;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)leadGroup.name ?? DBNull.Value;
            db.AddParameter(cmd, "lead_ids", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(leadGroup.leadids) ? DBNull.Value : leadGroup.leadids;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = leadGroup.createdat.HasValue ? leadGroup.createdat.Value : DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<LeadGroup> Update(LeadGroup leadGroup)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, leadGroup);
            }
            return leadGroup;
        }

        public async Task<bool> UpdateTransaction(IDb db, LeadGroup leadGroup)
        {
            string query = @"
                UPDATE lead_groups
                SET
                    organization_id = @organization_id::uuid,
                    name = @name,
                    lead_ids = @lead_ids::jsonb,
                    created_at = @created_at
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(leadGroup.id) ? DBNull.Value : leadGroup.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(leadGroup.organizationid) ? DBNull.Value : leadGroup.organizationid;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)leadGroup.name ?? DBNull.Value;
            db.AddParameter(cmd, "lead_ids", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(leadGroup.leadids) ? DBNull.Value : leadGroup.leadids;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = leadGroup.createdat.HasValue ? leadGroup.createdat.Value : DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(LeadGroupDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, LeadGroupDeleteReq req)
        {
            string query = @"
                DELETE FROM lead_groups
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
