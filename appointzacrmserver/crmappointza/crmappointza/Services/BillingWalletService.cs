using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class BillingWalletService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;

        public BillingWalletService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<BillingWallet>> Select(BillingWalletSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<BillingWallet>> SelectTransaction(IDb db, BillingWalletSelectReq req)
        {
            List<BillingWallet> result = new List<BillingWallet>();

            string query = @"
                SELECT
                    id, organization_id, balance
                FROM billing_wallets
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
                    BillingWallet billingWallet = new BillingWallet();
                    billingWallet.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    billingWallet.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    billingWallet.balance = reader["balance"] == DBNull.Value ? null : Convert.ToDecimal(reader["balance"]);
                    result.Add(billingWallet);
                }
            }

            return result;
        }

        public async Task<BillingWallet> Insert(BillingWallet billingWallet)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, billingWallet);
            }
            return billingWallet;
        }

        public async Task InsertTransaction(IDb db, BillingWallet billingWallet)
        {
            if (string.IsNullOrWhiteSpace(billingWallet.id))
                billingWallet.id = Guid.NewGuid().ToString();

            string query = @"
                INSERT INTO billing_wallets (
                    id, organization_id, balance
                )
                VALUES (
                    @id::uuid, @organization_id::uuid, @balance
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(billingWallet.id) ? DBNull.Value : billingWallet.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(billingWallet.organizationid) ? DBNull.Value : billingWallet.organizationid;
            db.AddParameter(cmd, "balance", DbTypes.Types.Decimal).Value = billingWallet.balance.HasValue ? billingWallet.balance.Value : DBNull.Value;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<BillingWallet> Update(BillingWallet billingWallet)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, billingWallet);
            }
            return billingWallet;
        }

        public async Task<bool> UpdateTransaction(IDb db, BillingWallet billingWallet)
        {
            string query = @"
                UPDATE billing_wallets
                SET
                    organization_id = @organization_id::uuid,
                    balance = @balance
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(billingWallet.id) ? DBNull.Value : billingWallet.id;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(billingWallet.organizationid) ? DBNull.Value : billingWallet.organizationid;
            db.AddParameter(cmd, "balance", DbTypes.Types.Decimal).Value = billingWallet.balance.HasValue ? billingWallet.balance.Value : DBNull.Value;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(BillingWalletDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, BillingWalletDeleteReq req)
        {
            string query = @"
                DELETE FROM billing_wallets
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }
    }
}
