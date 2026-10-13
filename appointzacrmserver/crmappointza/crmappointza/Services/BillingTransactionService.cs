using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class BillingTransactionService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public BillingTransactionService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<BillingTransaction>> Select(BillingTransactionSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<BillingTransaction>> SelectTransaction(IDb db, BillingTransactionSelectReq req)
        {
            List<BillingTransaction> result = new List<BillingTransaction>();

            string query = @"
                SELECT
                    id, wallet_id, date, description, amount, type, channel
                FROM billing_transactions
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.walletid))
                qb.AddParameter("wallet_id::text", "=", "walletid", req.walletid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.type))
                qb.AddParameter("type", "=", "type", req.type, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.channel))
                qb.AddParameter("channel", "=", "channel", req.channel, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "date");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    BillingTransaction billingTransaction = new BillingTransaction();
                    billingTransaction.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    billingTransaction.walletid = reader["wallet_id"] == DBNull.Value ? null : reader["wallet_id"]?.ToString();
                    billingTransaction.date = reader["date"] == DBNull.Value ? null : Convert.ToDateTime(reader["date"]);
                    billingTransaction.description = reader["description"] == DBNull.Value ? null : reader["description"]?.ToString();
                    billingTransaction.amount = reader["amount"] == DBNull.Value ? null : Convert.ToDecimal(reader["amount"]);
                    billingTransaction.type = reader["type"] == DBNull.Value ? null : reader["type"]?.ToString();
                    billingTransaction.channel = reader["channel"] == DBNull.Value ? null : reader["channel"]?.ToString();
                    result.Add(billingTransaction);
                }
            }

            return result;
        }

        public async Task<BillingTransaction> Insert(BillingTransaction billingTransaction)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, billingTransaction);
            }
            return billingTransaction;
        }

        public async Task InsertTransaction(IDb db, BillingTransaction billingTransaction)
        {
            if (string.IsNullOrWhiteSpace(billingTransaction.id))
                billingTransaction.id = Guid.NewGuid().ToString();
            if (billingTransaction.date == null)
                billingTransaction.date = DateTime.UtcNow;

            string query = @"
                INSERT INTO billing_transactions (
                    id, wallet_id, date, description, amount, type, channel
                )
                VALUES (
                    @id::uuid, @wallet_id::uuid, @date, @description, @amount, @type, @channel
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(billingTransaction.id) ? DBNull.Value : billingTransaction.id;
            db.AddParameter(cmd, "wallet_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(billingTransaction.walletid) ? DBNull.Value : billingTransaction.walletid;
            db.AddParameter(cmd, "date", DbTypes.Types.DateTime).Value = billingTransaction.date.HasValue ? billingTransaction.date.Value : DBNull.Value;
            db.AddParameter(cmd, "description", DbTypes.Types.String).Value = (object)billingTransaction.description ?? DBNull.Value;
            db.AddParameter(cmd, "amount", DbTypes.Types.Decimal).Value = billingTransaction.amount.HasValue ? billingTransaction.amount.Value : DBNull.Value;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = (object)billingTransaction.type ?? DBNull.Value;
            db.AddParameter(cmd, "channel", DbTypes.Types.String).Value = (object)billingTransaction.channel ?? DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<BillingTransaction> Update(BillingTransaction billingTransaction)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, billingTransaction);
            }
            return billingTransaction;
        }

        public async Task<bool> UpdateTransaction(IDb db, BillingTransaction billingTransaction)
        {
            string query = @"
                UPDATE billing_transactions
                SET
                    wallet_id = @wallet_id::uuid,
                    date = @date,
                    description = @description,
                    amount = @amount,
                    type = @type,
                    channel = @channel
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(billingTransaction.id) ? DBNull.Value : billingTransaction.id;
            db.AddParameter(cmd, "wallet_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(billingTransaction.walletid) ? DBNull.Value : billingTransaction.walletid;
            db.AddParameter(cmd, "date", DbTypes.Types.DateTime).Value = billingTransaction.date.HasValue ? billingTransaction.date.Value : DBNull.Value;
            db.AddParameter(cmd, "description", DbTypes.Types.String).Value = (object)billingTransaction.description ?? DBNull.Value;
            db.AddParameter(cmd, "amount", DbTypes.Types.Decimal).Value = billingTransaction.amount.HasValue ? billingTransaction.amount.Value : DBNull.Value;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = (object)billingTransaction.type ?? DBNull.Value;
            db.AddParameter(cmd, "channel", DbTypes.Types.String).Value = (object)billingTransaction.channel ?? DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(BillingTransactionDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, BillingTransactionDeleteReq req)
        {
            string query = @"
                DELETE FROM billing_transactions
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
