using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class WhatsAppInboundMessageService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public WhatsAppInboundMessageService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<WhatsAppInboundMessage>> Select(WhatsAppInboundMessageSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<WhatsAppInboundMessage>> SelectTransaction(IDb db, WhatsAppInboundMessageSelectReq req)
        {
            List<WhatsAppInboundMessage> result = new List<WhatsAppInboundMessage>();

            string query = @"
                SELECT
                    id, organization_id, phone_number_id, from_phone, message_type, text_body, wa_message_id, event_type, payload, created_at
                FROM whatsapp_inbound_messages
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.fromphone))
                qb.AddParameter("from_phone", "=", "fromphone", req.fromphone, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.phonenumberid))
                qb.AddParameter("phone_number_id", "=", "phonenumberid", req.phonenumberid, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "created_at");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    WhatsAppInboundMessage whatsAppInboundMessage = new WhatsAppInboundMessage();
                    whatsAppInboundMessage.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    whatsAppInboundMessage.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    whatsAppInboundMessage.phonenumberid = reader["phone_number_id"] == DBNull.Value ? null : reader["phone_number_id"]?.ToString();
                    whatsAppInboundMessage.fromphone = reader["from_phone"] == DBNull.Value ? null : reader["from_phone"]?.ToString();
                    whatsAppInboundMessage.messagetype = reader["message_type"] == DBNull.Value ? null : reader["message_type"]?.ToString();
                    whatsAppInboundMessage.textbody = reader["text_body"] == DBNull.Value ? null : reader["text_body"]?.ToString();
                    whatsAppInboundMessage.wamessageid = reader["wa_message_id"] == DBNull.Value ? null : reader["wa_message_id"]?.ToString();
                    whatsAppInboundMessage.eventtype = reader["event_type"] == DBNull.Value ? null : reader["event_type"]?.ToString();
                    whatsAppInboundMessage.payload = reader["payload"] == DBNull.Value ? null : reader["payload"]?.ToString();
                    whatsAppInboundMessage.createdat = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]);
                    result.Add(whatsAppInboundMessage);
                }
            }

            return result;
        }

        public async Task<WhatsAppInboundMessage> Insert(WhatsAppInboundMessage whatsAppInboundMessage)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, whatsAppInboundMessage);
            }
            return whatsAppInboundMessage;
        }

        public async Task InsertTransaction(IDb db, WhatsAppInboundMessage whatsAppInboundMessage)
        {
            if (string.IsNullOrWhiteSpace(whatsAppInboundMessage.id))
                whatsAppInboundMessage.id = Guid.NewGuid().ToString();
            if (whatsAppInboundMessage.createdat == null)
                whatsAppInboundMessage.createdat = DateTime.UtcNow;

            string query = @"
                INSERT INTO whatsapp_inbound_messages (
                    id, organization_id, phone_number_id, from_phone, message_type, text_body, wa_message_id, event_type, payload, created_at
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @phone_number_id, @from_phone, @message_type, @text_body, @wa_message_id, @event_type, @payload::jsonb, @created_at
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(whatsAppInboundMessage.id) ? DBNull.Value : whatsAppInboundMessage.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(whatsAppInboundMessage.organizationid) ? DBNull.Value : whatsAppInboundMessage.organizationid;
            db.AddParameter(cmd, "phone_number_id", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.phonenumberid ?? DBNull.Value;
            db.AddParameter(cmd, "from_phone", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.fromphone ?? DBNull.Value;
            db.AddParameter(cmd, "message_type", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.messagetype ?? DBNull.Value;
            db.AddParameter(cmd, "text_body", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.textbody ?? DBNull.Value;
            db.AddParameter(cmd, "wa_message_id", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.wamessageid ?? DBNull.Value;
            db.AddParameter(cmd, "event_type", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.eventtype ?? DBNull.Value;
            db.AddParameter(cmd, "payload", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(whatsAppInboundMessage.payload) ? DBNull.Value : whatsAppInboundMessage.payload;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = whatsAppInboundMessage.createdat.HasValue ? whatsAppInboundMessage.createdat.Value : DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<WhatsAppInboundMessage> Update(WhatsAppInboundMessage whatsAppInboundMessage)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, whatsAppInboundMessage);
            }
            return whatsAppInboundMessage;
        }

        public async Task<bool> UpdateTransaction(IDb db, WhatsAppInboundMessage whatsAppInboundMessage)
        {
            string query = @"
                UPDATE whatsapp_inbound_messages
                SET
                    organization_id = @organization_id::uuid,
                    phone_number_id = @phone_number_id,
                    from_phone = @from_phone,
                    message_type = @message_type,
                    text_body = @text_body,
                    wa_message_id = @wa_message_id,
                    event_type = @event_type,
                    payload = @payload::jsonb,
                    created_at = @created_at
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(whatsAppInboundMessage.id) ? DBNull.Value : whatsAppInboundMessage.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(whatsAppInboundMessage.organizationid) ? DBNull.Value : whatsAppInboundMessage.organizationid;
            db.AddParameter(cmd, "phone_number_id", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.phonenumberid ?? DBNull.Value;
            db.AddParameter(cmd, "from_phone", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.fromphone ?? DBNull.Value;
            db.AddParameter(cmd, "message_type", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.messagetype ?? DBNull.Value;
            db.AddParameter(cmd, "text_body", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.textbody ?? DBNull.Value;
            db.AddParameter(cmd, "wa_message_id", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.wamessageid ?? DBNull.Value;
            db.AddParameter(cmd, "event_type", DbTypes.Types.String).Value = (object)whatsAppInboundMessage.eventtype ?? DBNull.Value;
            db.AddParameter(cmd, "payload", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(whatsAppInboundMessage.payload) ? DBNull.Value : whatsAppInboundMessage.payload;
            db.AddParameter(cmd, "created_at", DbTypes.Types.DateTime).Value = whatsAppInboundMessage.createdat.HasValue ? whatsAppInboundMessage.createdat.Value : DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(WhatsAppInboundMessageDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, WhatsAppInboundMessageDeleteReq req)
        {
            string query = @"
                DELETE FROM whatsapp_inbound_messages
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
