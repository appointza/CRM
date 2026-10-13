using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class TemplateService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public TemplateService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Template>> Select(TemplateSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<Template>> SelectTransaction(IDb db, TemplateSelectReq req)
        {
            List<Template> result = new List<Template>();

            string query = @"
                SELECT
                    id, organization_id, channel, name, body, language, status, category, meta_id, variables_count, header_type, header_content, footer, buttons, variable_mapping
                FROM templates
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
            if (!string.IsNullOrEmpty(req.category))
                qb.AddParameter("category", "=", "category", req.category, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    Template template = new Template();
                    template.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    template.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    template.channel = reader["channel"] == DBNull.Value ? null : reader["channel"]?.ToString();
                    template.name = reader["name"] == DBNull.Value ? null : reader["name"]?.ToString();
                    template.body = reader["body"] == DBNull.Value ? null : reader["body"]?.ToString();
                    template.language = reader["language"] == DBNull.Value ? null : reader["language"]?.ToString();
                    template.status = reader["status"] == DBNull.Value ? null : reader["status"]?.ToString();
                    template.category = reader["category"] == DBNull.Value ? null : reader["category"]?.ToString();
                    template.metaid = reader["meta_id"] == DBNull.Value ? null : reader["meta_id"]?.ToString();
                    template.variablescount = reader["variables_count"] == DBNull.Value ? null : Convert.ToInt32(reader["variables_count"]);
                    template.headertype = reader["header_type"] == DBNull.Value ? null : reader["header_type"]?.ToString();
                    template.headercontent = reader["header_content"] == DBNull.Value ? null : reader["header_content"]?.ToString();
                    template.footer = reader["footer"] == DBNull.Value ? null : reader["footer"]?.ToString();
                    template.buttons = reader["buttons"] == DBNull.Value ? null : reader["buttons"]?.ToString();
                    template.variablemapping = reader["variable_mapping"] == DBNull.Value ? null : reader["variable_mapping"]?.ToString();
                    result.Add(template);
                }
            }

            return result;
        }

        public async Task<Template> Insert(Template template)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, template);
            }
            return template;
        }

        public async Task InsertTransaction(IDb db, Template template)
        {
            if (string.IsNullOrWhiteSpace(template.id))
                template.id = Guid.NewGuid().ToString();

            string query = @"
                INSERT INTO templates (
                    id, organization_id, channel, name, body, language, status, category, meta_id, variables_count, header_type, header_content, footer, buttons, variable_mapping
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @channel, @name, @body, @language, @status, @category, @meta_id, @variables_count, @header_type, @header_content, @footer, @buttons::jsonb, @variable_mapping::jsonb
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(template.id) ? DBNull.Value : template.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(template.organizationid) ? DBNull.Value : template.organizationid;
            db.AddParameter(cmd, "channel", DbTypes.Types.String).Value = (object)template.channel ?? DBNull.Value;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)template.name ?? DBNull.Value;
            db.AddParameter(cmd, "body", DbTypes.Types.String).Value = (object)template.body ?? DBNull.Value;
            db.AddParameter(cmd, "language", DbTypes.Types.String).Value = (object)template.language ?? DBNull.Value;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = (object)template.status ?? DBNull.Value;
            db.AddParameter(cmd, "category", DbTypes.Types.String).Value = (object)template.category ?? DBNull.Value;
            db.AddParameter(cmd, "meta_id", DbTypes.Types.String).Value = (object)template.metaid ?? DBNull.Value;
            db.AddParameter(cmd, "variables_count", DbTypes.Types.Integer).Value = template.variablescount.HasValue ? template.variablescount.Value : DBNull.Value;
            db.AddParameter(cmd, "header_type", DbTypes.Types.String).Value = (object)template.headertype ?? DBNull.Value;
            db.AddParameter(cmd, "header_content", DbTypes.Types.String).Value = (object)template.headercontent ?? DBNull.Value;
            db.AddParameter(cmd, "footer", DbTypes.Types.String).Value = (object)template.footer ?? DBNull.Value;
            db.AddParameter(cmd, "buttons", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(template.buttons) ? DBNull.Value : template.buttons;
            db.AddParameter(cmd, "variable_mapping", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(template.variablemapping) ? DBNull.Value : template.variablemapping;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<Template> Update(Template template)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, template);
            }
            return template;
        }

        public async Task<bool> UpdateTransaction(IDb db, Template template)
        {
            string query = @"
                UPDATE templates
                SET
                    organization_id = @organization_id::uuid,
                    channel = @channel,
                    name = @name,
                    body = @body,
                    language = @language,
                    status = @status,
                    category = @category,
                    meta_id = @meta_id,
                    variables_count = @variables_count,
                    header_type = @header_type,
                    header_content = @header_content,
                    footer = @footer,
                    buttons = @buttons::jsonb,
                    variable_mapping = @variable_mapping::jsonb
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(template.id) ? DBNull.Value : template.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(template.organizationid) ? DBNull.Value : template.organizationid;
            db.AddParameter(cmd, "channel", DbTypes.Types.String).Value = (object)template.channel ?? DBNull.Value;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)template.name ?? DBNull.Value;
            db.AddParameter(cmd, "body", DbTypes.Types.String).Value = (object)template.body ?? DBNull.Value;
            db.AddParameter(cmd, "language", DbTypes.Types.String).Value = (object)template.language ?? DBNull.Value;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = (object)template.status ?? DBNull.Value;
            db.AddParameter(cmd, "category", DbTypes.Types.String).Value = (object)template.category ?? DBNull.Value;
            db.AddParameter(cmd, "meta_id", DbTypes.Types.String).Value = (object)template.metaid ?? DBNull.Value;
            db.AddParameter(cmd, "variables_count", DbTypes.Types.Integer).Value = template.variablescount.HasValue ? template.variablescount.Value : DBNull.Value;
            db.AddParameter(cmd, "header_type", DbTypes.Types.String).Value = (object)template.headertype ?? DBNull.Value;
            db.AddParameter(cmd, "header_content", DbTypes.Types.String).Value = (object)template.headercontent ?? DBNull.Value;
            db.AddParameter(cmd, "footer", DbTypes.Types.String).Value = (object)template.footer ?? DBNull.Value;
            db.AddParameter(cmd, "buttons", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(template.buttons) ? DBNull.Value : template.buttons;
            db.AddParameter(cmd, "variable_mapping", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(template.variablemapping) ? DBNull.Value : template.variablemapping;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(TemplateDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, TemplateDeleteReq req)
        {
            string query = @"
                DELETE FROM templates
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
