using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class WhatsAppInboundMessageController : ControllerBase
    {
        ILogger<WhatsAppInboundMessageController> logger;
        WhatsAppInboundMessageService whatsAppInboundMessageService;

        public WhatsAppInboundMessageController(ILogger<WhatsAppInboundMessageController> logger, WhatsAppInboundMessageService whatsAppInboundMessageService)
        {
            this.logger = logger;
            this.whatsAppInboundMessageService = whatsAppInboundMessageService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<WhatsAppInboundMessage>>> Entity()
        {
            ActionRes<WhatsAppInboundMessage> result = new ActionRes<WhatsAppInboundMessage>()
            {
               item = new WhatsAppInboundMessage()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<WhatsAppInboundMessage>>>> Select(ActionReq<WhatsAppInboundMessageSelectReq> req)
        {
            ActionRes<List<WhatsAppInboundMessage>> result = new ActionRes<List<WhatsAppInboundMessage>>();

            result.item = await whatsAppInboundMessageService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<WhatsAppInboundMessage>>> Insert(ActionReq<WhatsAppInboundMessage> req)
        {
            ActionRes<WhatsAppInboundMessage> result = new ActionRes<WhatsAppInboundMessage>();

            result.item = await whatsAppInboundMessageService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<WhatsAppInboundMessage>>> Update(ActionReq<WhatsAppInboundMessage> req)
        {
            ActionRes<WhatsAppInboundMessage> result = new ActionRes<WhatsAppInboundMessage>();

            result.item = await whatsAppInboundMessageService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<WhatsAppInboundMessage>>> Save(ActionReq<WhatsAppInboundMessage> req)
        {
            ActionRes<WhatsAppInboundMessage> result = new ActionRes<WhatsAppInboundMessage>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await whatsAppInboundMessageService.Update(req.item);
            }else{
                result.item = await whatsAppInboundMessageService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<WhatsAppInboundMessageDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await whatsAppInboundMessageService.Delete(req.item);

            return Ok(result);
        }
    }
}
