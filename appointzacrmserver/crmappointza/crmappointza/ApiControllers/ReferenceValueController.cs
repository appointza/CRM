using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReferenceValueController : ControllerBase
    {
        ILogger<ReferenceValueController> logger;
        ReferenceValueService referenceValueService;

        public ReferenceValueController(ILogger<ReferenceValueController> logger, ReferenceValueService referenceValueService)
        {
            this.logger = logger;
            this.referenceValueService = referenceValueService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<ReferenceValue>>> Entity()
        {
            ActionRes<ReferenceValue> result = new ActionRes<ReferenceValue>()
            {
               item = new ReferenceValue()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<ReferenceValue>>>> Select(ActionReq<ReferenceValueSelectReq> req)
        {
            ActionRes<List<ReferenceValue>> result = new ActionRes<List<ReferenceValue>>();

            result.item = await referenceValueService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<ReferenceValue>>> Insert(ActionReq<ReferenceValue> req)
        {
            ActionRes<ReferenceValue> result = new ActionRes<ReferenceValue>();

            result.item = await referenceValueService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<ReferenceValue>>> Update(ActionReq<ReferenceValue> req)
        {
            ActionRes<ReferenceValue> result = new ActionRes<ReferenceValue>();

            result.item = await referenceValueService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<ReferenceValue>>> Save(ActionReq<ReferenceValue> req)
        {
            ActionRes<ReferenceValue> result = new ActionRes<ReferenceValue>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await referenceValueService.Update(req.item);
            }else{
                result.item = await referenceValueService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ReferenceValueDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await referenceValueService.Delete(req.item);

            return Ok(result);
        }
    }
}
