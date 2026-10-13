using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class InboundMessageService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public InboundMessageService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<InboundMessage>> Select(InboundMessageSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<InboundMessage>> SelectTransaction(IDb db, InboundMessageSelectReq req)
        {
            List<InboundMessage> result = new List<InboundMessage>();

            string query = @"
                SELECT
                    id, organization_id, channel, lead_id, from_address, text_body, subject, message_type, external_id, event_type, payload, created_at, direction, sent_by_user_id
                FROM inbound_messages
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.channel))
                qb.AddParameter("channel", "=", "channel", req.channel, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.leadid))
                qb.AddParameter("lead_id::text", "=", "leadid", req.leadid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.direction))
                qb.AddParameter("direction", "=", "direction", req.direction, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    InboundMessage inboundMessage = new InboundMessage();
                    inboundMessage.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    inboundMessage.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    inboundMessage.channel = reader["channel"] == DBNull.Value ? null : reader["channel"]?.ToString();
                    inboundMessage.leadid = reader["lead_id"] == DBNull.Value ? null : reader["lead_id"]?.ToString();
                    inboundMessage.fromaddress = reader["from_address"] == DBNull.Value ? null : reader["from_address"]?.ToString();
                    inboundMessage.textbody = reader["text_body"] == DBNull.Value ? null : reader["text_body"]?.ToString();
                    inboundMessage.subject = reader["subject"] == DBNull.Value ? null : reader["subject"]?.ToString();
                    inboundMessage.messagetype = reader["message_type"] == DBNull.Value ? null : reader["message_type"]?.ToString();
                    inboundMessage.externalid = reader["external_id"] == DBNull.Value ? null : reader["external_id"]?.ToString();
                    inboundMessage.eventtype = reader["event_type"] == DBNull.Value ? null : reader["event_type"]?.ToString();
                    inboundMessage.payload = reader["payload"] == DBNull.Value ? null : reader["payload"]?.ToString();
                    inboundMessage.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    inboundMessage.direction = reader["direction"] == DBNull.Value ? null : reader["direction"]?.ToString();
                    inboundMessage.sentbyuserid = reader["sent_by_user_id"] == DBNull.Value ? null : reader["sent_by_user_id"]?.ToString();
                    result.Add(inboundMessage);
                }
            }

            return result;
        }

        public async Task<InboundMessage> Insert(InboundMessage inboundMessage)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, inboundMessage);
            }
            return inboundMessage;
        }

        public async Task InsertTransaction(IDb db, InboundMessage inboundMessage)
        {
            if (string.IsNullOrWhiteSpace(inboundMessage.id))
                inboundMessage.id = Guid.NewGuid().ToString();
            if (inboundMessage.createdat == null)
                inboundMessage.createdat = DateTime.UtcNow;

            string query = @"
                INSERT INTO inbound_messages (
                    id, organization_id, channel, lead_id, from_address, text_body, subject, message_type, external_id, event_type, payload, created_at, direction, sent_by_user_id
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @channel, @lead_id::uuid, @from_address, @text_body, @subject, @message_type, @external_id, @event_type, @payload::jsonb, @created_at, @direction, @sent_by_user_id::uuid
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.id) ? DBNull.Value : inboundMessage.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.organizationid) ? DBNull.Value : inboundMessage.organizationid;
            db.AddParameter(cmd, "channel", DbTypes.Types.String).Value = (object)inboundMessage.channel ?? DBNull.Value;
            db.AddParameter(cmd, "lead_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.leadid) ? DBNull.Value : inboundMessage.leadid;
            db.AddParameter(cmd, "from_address", DbTypes.Types.String).Value = (object)inboundMessage.fromaddress ?? DBNull.Value;
            db.AddParameter(cmd, "text_body", DbTypes.Types.String).Value = (object)inboundMessage.textbody ?? DBNull.Value;
            db.AddParameter(cmd, "subject", DbTypes.Types.String).Value = (object)inboundMessage.subject ?? DBNull.Value;
            db.AddParameter(cmd, "message_type", DbTypes.Types.String).Value = (object)inboundMessage.messagetype ?? DBNull.Value;
            db.AddParameter(cmd, "external_id", DbTypes.Types.String).Value = (object)inboundMessage.externalid ?? DBNull.Value;
            db.AddParameter(cmd, "event_type", DbTypes.Types.String).Value = (object)inboundMessage.eventtype ?? DBNull.Value;
            db.AddParameter(cmd, "payload", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.payload) ? DBNull.Value : inboundMessage.payload;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = inboundMessage.createdat.HasValue ? inboundMessage.createdat.Value : DBNull.Value;
            db.AddParameter(cmd, "direction", DbTypes.Types.String).Value = (object)inboundMessage.direction ?? DBNull.Value;
            db.AddParameter(cmd, "sent_by_user_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.sentbyuserid) ? DBNull.Value : inboundMessage.sentbyuserid;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<InboundMessage> Update(InboundMessage inboundMessage)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, inboundMessage);
            }
            return inboundMessage;
        }

        public async Task<bool> UpdateTransaction(IDb db, InboundMessage inboundMessage)
        {
            string query = @"
                UPDATE inbound_messages
                SET
                    organization_id = @organization_id::uuid,
                    channel = @channel,
                    lead_id = @lead_id::uuid,
                    from_address = @from_address,
                    text_body = @text_body,
                    subject = @subject,
                    message_type = @message_type,
                    external_id = @external_id,
                    event_type = @event_type,
                    payload = @payload::jsonb,
                    created_at = @created_at,
                    direction = @direction,
                    sent_by_user_id = @sent_by_user_id::uuid
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.id) ? DBNull.Value : inboundMessage.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.organizationid) ? DBNull.Value : inboundMessage.organizationid;
            db.AddParameter(cmd, "channel", DbTypes.Types.String).Value = (object)inboundMessage.channel ?? DBNull.Value;
            db.AddParameter(cmd, "lead_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.leadid) ? DBNull.Value : inboundMessage.leadid;
            db.AddParameter(cmd, "from_address", DbTypes.Types.String).Value = (object)inboundMessage.fromaddress ?? DBNull.Value;
            db.AddParameter(cmd, "text_body", DbTypes.Types.String).Value = (object)inboundMessage.textbody ?? DBNull.Value;
            db.AddParameter(cmd, "subject", DbTypes.Types.String).Value = (object)inboundMessage.subject ?? DBNull.Value;
            db.AddParameter(cmd, "message_type", DbTypes.Types.String).Value = (object)inboundMessage.messagetype ?? DBNull.Value;
            db.AddParameter(cmd, "external_id", DbTypes.Types.String).Value = (object)inboundMessage.externalid ?? DBNull.Value;
            db.AddParameter(cmd, "event_type", DbTypes.Types.String).Value = (object)inboundMessage.eventtype ?? DBNull.Value;
            db.AddParameter(cmd, "payload", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.payload) ? DBNull.Value : inboundMessage.payload;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = inboundMessage.createdat.HasValue ? inboundMessage.createdat.Value : DBNull.Value;
            db.AddParameter(cmd, "direction", DbTypes.Types.String).Value = (object)inboundMessage.direction ?? DBNull.Value;
            db.AddParameter(cmd, "sent_by_user_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(inboundMessage.sentbyuserid) ? DBNull.Value : inboundMessage.sentbyuserid;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(InboundMessageDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, InboundMessageDeleteReq req)
        {
            string query = @"
                DELETE FROM inbound_messages
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
