using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class OrganizationService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public OrganizationService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Organization>> Select(OrganizationSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<Organization>> SelectTransaction(IDb db, OrganizationSelectReq req)
        {
            List<Organization> result = new List<Organization>();

            string query = @"
                SELECT
                    id, name, plan, industry, country, timezone, website, support_email, billing_email, address, gstin, created_at
                FROM organizations
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.name))
                qb.AddParameter("name", "=", "name", req.name, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    Organization organization = new Organization();
                    organization.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    organization.name = reader["name"] == DBNull.Value ? null : reader["name"]?.ToString();
                    organization.plan = reader["plan"] == DBNull.Value ? null : reader["plan"]?.ToString();
                    organization.industry = reader["industry"] == DBNull.Value ? null : reader["industry"]?.ToString();
                    organization.country = reader["country"] == DBNull.Value ? null : reader["country"]?.ToString();
                    organization.timezone = reader["timezone"] == DBNull.Value ? null : reader["timezone"]?.ToString();
                    organization.website = reader["website"] == DBNull.Value ? null : reader["website"]?.ToString();
                    organization.supportemail = reader["support_email"] == DBNull.Value ? null : reader["support_email"]?.ToString();
                    organization.billingemail = reader["billing_email"] == DBNull.Value ? null : reader["billing_email"]?.ToString();
                    organization.address = reader["address"] == DBNull.Value ? null : reader["address"]?.ToString();
                    organization.gstin = reader["gstin"] == DBNull.Value ? null : reader["gstin"]?.ToString();
                    organization.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    result.Add(organization);
                }
            }

            return result;
        }

        public async Task<Organization> Insert(Organization organization)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, organization);
            }
            return organization;
        }

        public async Task InsertTransaction(IDb db, Organization organization)
        {
            if (string.IsNullOrWhiteSpace(organization.id))
                organization.id = Guid.NewGuid().ToString();
            if (organization.createdat == null)
                organization.createdat = DateTime.UtcNow;

            string query = @"
                INSERT INTO organizations (
                    id, name, plan, industry, country, timezone, website, support_email, billing_email, address, gstin, created_at
                )
                VALUES (
                    @id::uuid, @name, @plan, @industry, @country, @timezone, @website, @support_email, @billing_email, @address, @gstin, @created_at
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(organization.id) ? DBNull.Value : organization.id;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)organization.name ?? DBNull.Value;
            db.AddParameter(cmd, "plan", DbTypes.Types.String).Value = (object)organization.plan ?? DBNull.Value;
            db.AddParameter(cmd, "industry", DbTypes.Types.String).Value = (object)organization.industry ?? DBNull.Value;
            db.AddParameter(cmd, "country", DbTypes.Types.String).Value = (object)organization.country ?? DBNull.Value;
            db.AddParameter(cmd, "timezone", DbTypes.Types.String).Value = (object)organization.timezone ?? DBNull.Value;
            db.AddParameter(cmd, "website", DbTypes.Types.String).Value = (object)organization.website ?? DBNull.Value;
            db.AddParameter(cmd, "support_email", DbTypes.Types.String).Value = (object)organization.supportemail ?? DBNull.Value;
            db.AddParameter(cmd, "billing_email", DbTypes.Types.String).Value = (object)organization.billingemail ?? DBNull.Value;
            db.AddParameter(cmd, "address", DbTypes.Types.String).Value = (object)organization.address ?? DBNull.Value;
            db.AddParameter(cmd, "gstin", DbTypes.Types.String).Value = (object)organization.gstin ?? DBNull.Value;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = organization.createdat.HasValue ? organization.createdat.Value : DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<Organization> Update(Organization organization)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, organization);
            }
            return organization;
        }

        public async Task<bool> UpdateTransaction(IDb db, Organization organization)
        {
            string query = @"
                UPDATE organizations
                SET
                    name = @name,
                    plan = @plan,
                    industry = @industry,
                    country = @country,
                    timezone = @timezone,
                    website = @website,
                    support_email = @support_email,
                    billing_email = @billing_email,
                    address = @address,
                    gstin = @gstin,
                    created_at = @created_at
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(organization.id) ? DBNull.Value : organization.id;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)organization.name ?? DBNull.Value;
            db.AddParameter(cmd, "plan", DbTypes.Types.String).Value = (object)organization.plan ?? DBNull.Value;
            db.AddParameter(cmd, "industry", DbTypes.Types.String).Value = (object)organization.industry ?? DBNull.Value;
            db.AddParameter(cmd, "country", DbTypes.Types.String).Value = (object)organization.country ?? DBNull.Value;
            db.AddParameter(cmd, "timezone", DbTypes.Types.String).Value = (object)organization.timezone ?? DBNull.Value;
            db.AddParameter(cmd, "website", DbTypes.Types.String).Value = (object)organization.website ?? DBNull.Value;
            db.AddParameter(cmd, "support_email", DbTypes.Types.String).Value = (object)organization.supportemail ?? DBNull.Value;
            db.AddParameter(cmd, "billing_email", DbTypes.Types.String).Value = (object)organization.billingemail ?? DBNull.Value;
            db.AddParameter(cmd, "address", DbTypes.Types.String).Value = (object)organization.address ?? DBNull.Value;
            db.AddParameter(cmd, "gstin", DbTypes.Types.String).Value = (object)organization.gstin ?? DBNull.Value;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = organization.createdat.HasValue ? organization.createdat.Value : DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(OrganizationDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, OrganizationDeleteReq req)
        {
            string query = @"
                DELETE FROM organizations
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
