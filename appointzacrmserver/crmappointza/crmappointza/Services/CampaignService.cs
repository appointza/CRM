using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class CampaignService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public CampaignService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Campaign>> Select(CampaignSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<Campaign>> SelectTransaction(IDb db, CampaignSelectReq req)
        {
            List<Campaign> result = new List<Campaign>();

            string query = @"
                SELECT
                    id, organization_id, name, channel, template_id, lead_ids, status, sent, delivered, failed, created_at, recipient_results
                FROM campaigns
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.name))
                qb.AddParameter("name", "=", "name", req.name, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.channel))
                qb.AddParameter("channel", "=", "channel", req.channel, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.status))
                qb.AddParameter("status", "=", "status", req.status, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    Campaign campaign = new Campaign();
                    campaign.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    campaign.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    campaign.name = reader["name"] == DBNull.Value ? null : reader["name"]?.ToString();
                    campaign.channel = reader["channel"] == DBNull.Value ? null : reader["channel"]?.ToString();
                    campaign.templateid = reader["template_id"] == DBNull.Value ? null : reader["template_id"]?.ToString();
                    campaign.leadids = reader["lead_ids"] == DBNull.Value ? null : reader["lead_ids"]?.ToString();
                    campaign.status = reader["status"] == DBNull.Value ? null : reader["status"]?.ToString();
                    campaign.sent = reader["sent"] == DBNull.Value ? null : Convert.ToInt32(reader["sent"]);
                    campaign.delivered = reader["delivered"] == DBNull.Value ? null : Convert.ToInt32(reader["delivered"]);
                    campaign.failed = reader["failed"] == DBNull.Value ? null : Convert.ToInt32(reader["failed"]);
                    campaign.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    campaign.recipientresults = reader["recipient_results"] == DBNull.Value ? null : reader["recipient_results"]?.ToString();
                    result.Add(campaign);
                }
            }

            return result;
        }

        public async Task<Campaign> Insert(Campaign campaign)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, campaign);
            }
            return campaign;
        }

        public async Task InsertTransaction(IDb db, Campaign campaign)
        {
            if (string.IsNullOrWhiteSpace(campaign.id))
                campaign.id = Guid.NewGuid().ToString();
            if (campaign.createdat == null)
                campaign.createdat = DateTime.UtcNow;

            string query = @"
                INSERT INTO campaigns (
                    id, organization_id, name, channel, template_id, lead_ids, status, sent, delivered, failed, created_at, recipient_results
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @name, @channel, @template_id::uuid, @lead_ids::jsonb, @status, @sent, @delivered, @failed, @created_at, @recipient_results::jsonb
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.id) ? DBNull.Value : campaign.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.organizationid) ? DBNull.Value : campaign.organizationid;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)campaign.name ?? DBNull.Value;
            db.AddParameter(cmd, "channel", DbTypes.Types.String).Value = (object)campaign.channel ?? DBNull.Value;
            db.AddParameter(cmd, "template_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.templateid) ? DBNull.Value : campaign.templateid;
            db.AddParameter(cmd, "lead_ids", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.leadids) ? DBNull.Value : campaign.leadids;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = (object)campaign.status ?? DBNull.Value;
            db.AddParameter(cmd, "sent", DbTypes.Types.Integer).Value = campaign.sent.HasValue ? campaign.sent.Value : DBNull.Value;
            db.AddParameter(cmd, "delivered", DbTypes.Types.Integer).Value = campaign.delivered.HasValue ? campaign.delivered.Value : DBNull.Value;
            db.AddParameter(cmd, "failed", DbTypes.Types.Integer).Value = campaign.failed.HasValue ? campaign.failed.Value : DBNull.Value;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = campaign.createdat.HasValue ? campaign.createdat.Value : DBNull.Value;
            db.AddParameter(cmd, "recipient_results", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.recipientresults) ? DBNull.Value : campaign.recipientresults;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<Campaign> Update(Campaign campaign)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, campaign);
            }
            return campaign;
        }

        public async Task<bool> UpdateTransaction(IDb db, Campaign campaign)
        {
            string query = @"
                UPDATE campaigns
                SET
                    organization_id = @organization_id::uuid,
                    name = @name,
                    channel = @channel,
                    template_id = @template_id::uuid,
                    lead_ids = @lead_ids::jsonb,
                    status = @status,
                    sent = @sent,
                    delivered = @delivered,
                    failed = @failed,
                    created_at = @created_at,
                    recipient_results = @recipient_results::jsonb
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.id) ? DBNull.Value : campaign.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.organizationid) ? DBNull.Value : campaign.organizationid;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)campaign.name ?? DBNull.Value;
            db.AddParameter(cmd, "channel", DbTypes.Types.String).Value = (object)campaign.channel ?? DBNull.Value;
            db.AddParameter(cmd, "template_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.templateid) ? DBNull.Value : campaign.templateid;
            db.AddParameter(cmd, "lead_ids", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.leadids) ? DBNull.Value : campaign.leadids;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = (object)campaign.status ?? DBNull.Value;
            db.AddParameter(cmd, "sent", DbTypes.Types.Integer).Value = campaign.sent.HasValue ? campaign.sent.Value : DBNull.Value;
            db.AddParameter(cmd, "delivered", DbTypes.Types.Integer).Value = campaign.delivered.HasValue ? campaign.delivered.Value : DBNull.Value;
            db.AddParameter(cmd, "failed", DbTypes.Types.Integer).Value = campaign.failed.HasValue ? campaign.failed.Value : DBNull.Value;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = campaign.createdat.HasValue ? campaign.createdat.Value : DBNull.Value;
            db.AddParameter(cmd, "recipient_results", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(campaign.recipientresults) ? DBNull.Value : campaign.recipientresults;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(CampaignDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, CampaignDeleteReq req)
        {
            string query = @"
                DELETE FROM campaigns
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
