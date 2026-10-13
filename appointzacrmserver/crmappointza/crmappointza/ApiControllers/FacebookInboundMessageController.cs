using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class FacebookInboundMessageController : ControllerBase
    {
        FacebookInboundMessageService facebookInboundMessageService;

        public FacebookInboundMessageController(FacebookInboundMessageService facebookInboundMessageService)
        {
            this.facebookInboundMessageService = facebookInboundMessageService;
        }

        [HttpGet("Entity")]
        public ActionResult<ActionRes<FacebookInboundMessage>> Entity()
        {
            return Ok(new ActionRes<FacebookInboundMessage> { item = new FacebookInboundMessage() });
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<FacebookInboundMessage>>>> Select(ActionReq<FacebookInboundMessageSelectReq> req)
        {
            return Ok(new ActionRes<List<FacebookInboundMessage>>
            {
                item = await facebookInboundMessageService.Select(req.item)
            });
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<FacebookInboundMessage>>> Insert(ActionReq<FacebookInboundMessage> req)
        {
            return Ok(new ActionRes<FacebookInboundMessage>
            {
                item = await facebookInboundMessageService.Insert(req.item)
            });
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<FacebookInboundMessage>>> Update(ActionReq<FacebookInboundMessage> req)
        {
            return Ok(new ActionRes<FacebookInboundMessage>
            {
                item = await facebookInboundMessageService.Update(req.item)
            });
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<FacebookInboundMessage>>> Save(ActionReq<FacebookInboundMessage> req)
        {
            var item = !string.IsNullOrWhiteSpace(req.item.id)
                ? await facebookInboundMessageService.Update(req.item)
                : await facebookInboundMessageService.Insert(req.item);
            return Ok(new ActionRes<FacebookInboundMessage> { item = item });
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<FacebookInboundMessageDeleteReq> req)
        {
            return Ok(new ActionRes<bool> { item = await facebookInboundMessageService.Delete(req.item) });
        }
    }
}
