using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class ChannelConfigurationService
    {
        /// <summary>0 = unknown, 1 = has facebook_config, 2 = legacy table without it.</summary>
        static int facebookConfigColumnMode;
        /// <summary>0 = unknown, 1 = has google_api_key, 2 = legacy table without it.</summary>
        static int googleApiKeyColumnMode;

        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public ChannelConfigurationService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<ChannelConfiguration>> Select(ChannelConfigurationSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        static async Task<int> ResolveFacebookConfigColumnMode(IDb db)
        {
            if (facebookConfigColumnMode != 0)
                return facebookConfigColumnMode;
            try
            {
                var cmd = db.GetCommand(@"
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'channel_configurations'
                      AND column_name = 'facebook_config'
                    LIMIT 1;
                ");
                using var reader = await db.Execute(cmd);
                facebookConfigColumnMode = await reader.ReadAsync() ? 1 : 2;
            }
            catch
            {
                facebookConfigColumnMode = 2;
            }
            return facebookConfigColumnMode;
        }

        static async Task<int> ResolveGoogleApiKeyColumnMode(IDb db)
        {
            if (googleApiKeyColumnMode != 0)
                return googleApiKeyColumnMode;
            try
            {
                var cmd = db.GetCommand(@"
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'channel_configurations'
                      AND column_name = 'google_api_key'
                    LIMIT 1;
                ");
                using var reader = await db.Execute(cmd);
                googleApiKeyColumnMode = await reader.ReadAsync() ? 1 : 2;
            }
            catch
            {
                googleApiKeyColumnMode = 2;
            }
            return googleApiKeyColumnMode;
        }

        public async Task<List<ChannelConfiguration>> SelectTransaction(IDb db, ChannelConfigurationSelectReq req)
        {
            List<ChannelConfiguration> result = new List<ChannelConfiguration>();
            var fbMode = await ResolveFacebookConfigColumnMode(db);
            var googleMode = await ResolveGoogleApiKeyColumnMode(db);

            var selectCols = "id, organization_id, email_config, whatsapp_config, sms_config";
            if (fbMode == 1)
                selectCols += ", facebook_config";
            if (googleMode == 1)
                selectCols += ", google_api_key";

            string query = $@"
                SELECT
                    {selectCols}
                FROM channel_configurations
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    ChannelConfiguration channelConfiguration = new ChannelConfiguration();
                    channelConfiguration.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    channelConfiguration.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    channelConfiguration.emailconfig = reader["email_config"] == DBNull.Value ? null : reader["email_config"]?.ToString();
                    channelConfiguration.whatsappconfig = reader["whatsapp_config"] == DBNull.Value ? null : reader["whatsapp_config"]?.ToString();
                    channelConfiguration.smsconfig = reader["sms_config"] == DBNull.Value ? null : reader["sms_config"]?.ToString();
                    if (fbMode == 1)
                        channelConfiguration.facebookconfig = reader["facebook_config"] == DBNull.Value ? null : reader["facebook_config"]?.ToString();
                    else
                        channelConfiguration.facebookconfig = "{}";
                    if (googleMode == 1)
                        channelConfiguration.googleapikey = reader["google_api_key"] == DBNull.Value ? null : reader["google_api_key"]?.ToString();
                    else
                        channelConfiguration.googleapikey = null;
                    result.Add(channelConfiguration);
                }
            }

            return result;
        }

        public async Task<ChannelConfiguration> Insert(ChannelConfiguration channelConfiguration)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, channelConfiguration);
            }
            return channelConfiguration;
        }

        public async Task InsertTransaction(IDb db, ChannelConfiguration channelConfiguration)
        {
            if (string.IsNullOrWhiteSpace(channelConfiguration.id))
                channelConfiguration.id = Guid.NewGuid().ToString();

            var fbMode = await ResolveFacebookConfigColumnMode(db);
            var googleMode = await ResolveGoogleApiKeyColumnMode(db);
            string insertCols = "id, organization_id, email_config, whatsapp_config, sms_config";
            string insertVals = "@id::uuid, @organization_id::uuid, @email_config::jsonb, @whatsapp_config::jsonb, @sms_config::jsonb";
            if (fbMode == 1)
            {
                insertCols += ", facebook_config";
                insertVals += ", @facebook_config::jsonb";
            }
            if (googleMode == 1)
            {
                insertCols += ", google_api_key";
                insertVals += ", @google_api_key";
            }

            string query = $@"
                INSERT INTO channel_configurations ({insertCols})
                VALUES ({insertVals});
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.id) ? DBNull.Value : channelConfiguration.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.organizationid) ? DBNull.Value : channelConfiguration.organizationid;
            db.AddParameter(cmd, "email_config", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.emailconfig) ? "{}" : channelConfiguration.emailconfig;
            db.AddParameter(cmd, "whatsapp_config", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.whatsappconfig) ? "{}" : channelConfiguration.whatsappconfig;
            db.AddParameter(cmd, "sms_config", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.smsconfig) ? "{}" : channelConfiguration.smsconfig;
            if (fbMode == 1)
                db.AddParameter(cmd, "facebook_config", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.facebookconfig) ? "{}" : channelConfiguration.facebookconfig;
            if (googleMode == 1)
                db.AddParameter(cmd, "google_api_key", DbTypes.Types.String).Value = (object)channelConfiguration.googleapikey ?? DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<ChannelConfiguration> Update(ChannelConfiguration channelConfiguration)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, channelConfiguration);
            }
            return channelConfiguration;
        }

        public async Task<bool> UpdateTransaction(IDb db, ChannelConfiguration channelConfiguration)
        {
            var fbMode = await ResolveFacebookConfigColumnMode(db);
            var googleMode = await ResolveGoogleApiKeyColumnMode(db);
            string fbSet = fbMode == 1 ? ", facebook_config = @facebook_config::jsonb" : "";
            string googleSet = googleMode == 1 ? ", google_api_key = @google_api_key" : "";

            string query = $@"
                UPDATE channel_configurations
                SET
                    organization_id = @organization_id::uuid,
                    email_config = @email_config::jsonb,
                    whatsapp_config = @whatsapp_config::jsonb,
                    sms_config = @sms_config::jsonb{fbSet}{googleSet}
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.id) ? DBNull.Value : channelConfiguration.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.organizationid) ? DBNull.Value : channelConfiguration.organizationid;
            db.AddParameter(cmd, "email_config", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.emailconfig) ? "{}" : channelConfiguration.emailconfig;
            db.AddParameter(cmd, "whatsapp_config", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.whatsappconfig) ? "{}" : channelConfiguration.whatsappconfig;
            db.AddParameter(cmd, "sms_config", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.smsconfig) ? "{}" : channelConfiguration.smsconfig;
            if (fbMode == 1)
                db.AddParameter(cmd, "facebook_config", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(channelConfiguration.facebookconfig) ? "{}" : channelConfiguration.facebookconfig;
            if (googleMode == 1)
                db.AddParameter(cmd, "google_api_key", DbTypes.Types.String).Value = (object)channelConfiguration.googleapikey ?? DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<ChannelConfiguration> EnsureForOrganization(string organizationId)
        {
            var rows = await Select(new ChannelConfigurationSelectReq { organizationid = organizationId });
            if (rows.Count > 0)
                return rows[0];
            var row = new ChannelConfiguration
            {
                organizationid = organizationId,
                emailconfig = "{}",
                whatsappconfig = "{}",
                smsconfig = "{}",
                facebookconfig = "{}",
            };
            return await Insert(row);
        }

        public async Task<bool> Delete(ChannelConfigurationDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, ChannelConfigurationDeleteReq req)
        {
            string query = @"
                DELETE FROM channel_configurations
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
