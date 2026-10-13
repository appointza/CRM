using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class BillingTransactionController : ControllerBase
    {
        ILogger<BillingTransactionController> logger;
        BillingTransactionService billingTransactionService;

        public BillingTransactionController(ILogger<BillingTransactionController> logger, BillingTransactionService billingTransactionService)
        {
            this.logger = logger;
            this.billingTransactionService = billingTransactionService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<BillingTransaction>>> Entity()
        {
            ActionRes<BillingTransaction> result = new ActionRes<BillingTransaction>()
            {
               item = new BillingTransaction()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<BillingTransaction>>>> Select(ActionReq<BillingTransactionSelectReq> req)
        {
            ActionRes<List<BillingTransaction>> result = new ActionRes<List<BillingTransaction>>();

            result.item = await billingTransactionService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<BillingTransaction>>> Insert(ActionReq<BillingTransaction> req)
        {
            ActionRes<BillingTransaction> result = new ActionRes<BillingTransaction>();

            result.item = await billingTransactionService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<BillingTransaction>>> Update(ActionReq<BillingTransaction> req)
        {
            ActionRes<BillingTransaction> result = new ActionRes<BillingTransaction>();

            result.item = await billingTransactionService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<BillingTransaction>>> Save(ActionReq<BillingTransaction> req)
        {
            ActionRes<BillingTransaction> result = new ActionRes<BillingTransaction>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await billingTransactionService.Update(req.item);
            }else{
                result.item = await billingTransactionService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<BillingTransactionDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await billingTransactionService.Delete(req.item);

            return Ok(result);
        }
    }
}
