using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class InboundMessageController : ControllerBase
    {
        ILogger<InboundMessageController> logger;
        InboundMessageService inboundMessageService;

        public InboundMessageController(ILogger<InboundMessageController> logger, InboundMessageService inboundMessageService)
        {
            this.logger = logger;
            this.inboundMessageService = inboundMessageService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<InboundMessage>>> Entity()
        {
            ActionRes<InboundMessage> result = new ActionRes<InboundMessage>()
            {
               item = new InboundMessage()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<InboundMessage>>>> Select(ActionReq<InboundMessageSelectReq> req)
        {
            ActionRes<List<InboundMessage>> result = new ActionRes<List<InboundMessage>>();

            result.item = await inboundMessageService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<InboundMessage>>> Insert(ActionReq<InboundMessage> req)
        {
            ActionRes<InboundMessage> result = new ActionRes<InboundMessage>();

            result.item = await inboundMessageService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<InboundMessage>>> Update(ActionReq<InboundMessage> req)
        {
            ActionRes<InboundMessage> result = new ActionRes<InboundMessage>();

            result.item = await inboundMessageService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<InboundMessage>>> Save(ActionReq<InboundMessage> req)
        {
            ActionRes<InboundMessage> result = new ActionRes<InboundMessage>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await inboundMessageService.Update(req.item);
            }else{
                result.item = await inboundMessageService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<InboundMessageDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await inboundMessageService.Delete(req.item);

            return Ok(result);
        }
    }
}
