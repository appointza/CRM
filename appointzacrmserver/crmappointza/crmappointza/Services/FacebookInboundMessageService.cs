using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class FacebookInboundMessageService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public FacebookInboundMessageService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<FacebookInboundMessage>> Select(FacebookInboundMessageSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<FacebookInboundMessage>> SelectTransaction(IDb db, FacebookInboundMessageSelectReq req)
        {
            List<FacebookInboundMessage> result = new List<FacebookInboundMessage>();

            string query = @"
                SELECT
                    id, organization_id, page_id, sender_id, message_type, text_body, fb_message_id, event_type, payload, created_at
                FROM facebook_inbound_messages
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.senderid))
                qb.AddParameter("sender_id", "=", "senderid", req.senderid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.pageid))
                qb.AddParameter("page_id", "=", "pageid", req.pageid, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    FacebookInboundMessage row = new FacebookInboundMessage();
                    row.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    row.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    row.pageid = reader["page_id"] == DBNull.Value ? null : reader["page_id"]?.ToString();
                    row.senderid = reader["sender_id"] == DBNull.Value ? null : reader["sender_id"]?.ToString();
                    row.messagetype = reader["message_type"] == DBNull.Value ? null : reader["message_type"]?.ToString();
                    row.textbody = reader["text_body"] == DBNull.Value ? null : reader["text_body"]?.ToString();
                    row.fbmessageid = reader["fb_message_id"] == DBNull.Value ? null : reader["fb_message_id"]?.ToString();
                    row.eventtype = reader["event_type"] == DBNull.Value ? null : reader["event_type"]?.ToString();
                    row.payload = reader["payload"] == DBNull.Value ? null : reader["payload"]?.ToString();
                    row.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    result.Add(row);
                }
            }

            return result;
        }

        public async Task<FacebookInboundMessage> Insert(FacebookInboundMessage message)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, message);
            }
            return message;
        }

        public async Task InsertTransaction(IDb db, FacebookInboundMessage message)
        {
            if (string.IsNullOrWhiteSpace(message.id))
                message.id = Guid.NewGuid().ToString();
            if (message.createdat == null)
                message.createdat = DateTime.UtcNow;

            string query = @"
                INSERT INTO facebook_inbound_messages (
                    id, organization_id, page_id, sender_id, message_type, text_body, fb_message_id, event_type, payload, created_at
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @page_id, @sender_id, @message_type, @text_body, @fb_message_id, @event_type, @payload::jsonb, @created_at
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(message.id) ? DBNull.Value : message.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(message.organizationid) ? DBNull.Value : message.organizationid;
            db.AddParameter(cmd, "page_id", DbTypes.Types.String).Value = (object)message.pageid ?? DBNull.Value;
            db.AddParameter(cmd, "sender_id", DbTypes.Types.String).Value = (object)message.senderid ?? DBNull.Value;
            db.AddParameter(cmd, "message_type", DbTypes.Types.String).Value = (object)message.messagetype ?? DBNull.Value;
            db.AddParameter(cmd, "text_body", DbTypes.Types.String).Value = (object)message.textbody ?? DBNull.Value;
            db.AddParameter(cmd, "fb_message_id", DbTypes.Types.String).Value = (object)message.fbmessageid ?? DBNull.Value;
            db.AddParameter(cmd, "event_type", DbTypes.Types.String).Value = (object)message.eventtype ?? DBNull.Value;
            db.AddParameter(cmd, "payload", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(message.payload) ? "{}" : message.payload;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = message.createdat.HasValue ? message.createdat.Value : DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<FacebookInboundMessage> Update(FacebookInboundMessage message)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, message);
            }
            return message;
        }

        public async Task<bool> UpdateTransaction(IDb db, FacebookInboundMessage message)
        {
            string query = @"
                UPDATE facebook_inbound_messages
                SET
                    organization_id = @organization_id::uuid,
                    page_id = @page_id,
                    sender_id = @sender_id,
                    message_type = @message_type,
                    text_body = @text_body,
                    fb_message_id = @fb_message_id,
                    event_type = @event_type,
                    payload = @payload::jsonb,
                    created_at = @created_at
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(message.id) ? DBNull.Value : message.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(message.organizationid) ? DBNull.Value : message.organizationid;
            db.AddParameter(cmd, "page_id", DbTypes.Types.String).Value = (object)message.pageid ?? DBNull.Value;
            db.AddParameter(cmd, "sender_id", DbTypes.Types.String).Value = (object)message.senderid ?? DBNull.Value;
            db.AddParameter(cmd, "message_type", DbTypes.Types.String).Value = (object)message.messagetype ?? DBNull.Value;
            db.AddParameter(cmd, "text_body", DbTypes.Types.String).Value = (object)message.textbody ?? DBNull.Value;
            db.AddParameter(cmd, "fb_message_id", DbTypes.Types.String).Value = (object)message.fbmessageid ?? DBNull.Value;
            db.AddParameter(cmd, "event_type", DbTypes.Types.String).Value = (object)message.eventtype ?? DBNull.Value;
            db.AddParameter(cmd, "payload", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(message.payload) ? DBNull.Value : message.payload;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = message.createdat.HasValue ? message.createdat.Value : DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(FacebookInboundMessageDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, FacebookInboundMessageDeleteReq req)
        {
            string query = @"DELETE FROM facebook_inbound_messages WHERE id = @id::uuid";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";
            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
