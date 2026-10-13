using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class BillingWalletController : ControllerBase
    {
        ILogger<BillingWalletController> logger;
        BillingWalletService billingWalletService;

        public BillingWalletController(ILogger<BillingWalletController> logger, BillingWalletService billingWalletService)
        {
            this.logger = logger;
            this.billingWalletService = billingWalletService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<BillingWallet>>> Entity()
        {
            ActionRes<BillingWallet> result = new ActionRes<BillingWallet>()
            {
               item = new BillingWallet()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<BillingWallet>>>> Select(ActionReq<BillingWalletSelectReq> req)
        {
            ActionRes<List<BillingWallet>> result = new ActionRes<List<BillingWallet>>();

            result.item = await billingWalletService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<BillingWallet>>> Insert(ActionReq<BillingWallet> req)
        {
            ActionRes<BillingWallet> result = new ActionRes<BillingWallet>();

            result.item = await billingWalletService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<BillingWallet>>> Update(ActionReq<BillingWallet> req)
        {
            ActionRes<BillingWallet> result = new ActionRes<BillingWallet>();

            result.item = await billingWalletService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<BillingWallet>>> Save(ActionReq<BillingWallet> req)
        {
            ActionRes<BillingWallet> result = new ActionRes<BillingWallet>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await billingWalletService.Update(req.item);
            }else{
                result.item = await billingWalletService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<BillingWalletDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await billingWalletService.Delete(req.item);

            return Ok(result);
        }
    }
}
