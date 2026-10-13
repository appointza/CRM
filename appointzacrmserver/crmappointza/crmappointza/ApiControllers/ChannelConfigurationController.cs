using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChannelConfigurationController : ControllerBase
    {
        ILogger<ChannelConfigurationController> logger;
        ChannelConfigurationService channelConfigurationService;

        public ChannelConfigurationController(ILogger<ChannelConfigurationController> logger, ChannelConfigurationService channelConfigurationService)
        {
            this.logger = logger;
            this.channelConfigurationService = channelConfigurationService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<ChannelConfiguration>>> Entity()
        {
            ActionRes<ChannelConfiguration> result = new ActionRes<ChannelConfiguration>()
            {
               item = new ChannelConfiguration()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<ChannelConfiguration>>>> Select(ActionReq<ChannelConfigurationSelectReq> req)
        {
            ActionRes<List<ChannelConfiguration>> result = new ActionRes<List<ChannelConfiguration>>();

            result.item = await channelConfigurationService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<ChannelConfiguration>>> Insert(ActionReq<ChannelConfiguration> req)
        {
            ActionRes<ChannelConfiguration> result = new ActionRes<ChannelConfiguration>();

            result.item = await channelConfigurationService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<ChannelConfiguration>>> Update(ActionReq<ChannelConfiguration> req)
        {
            ActionRes<ChannelConfiguration> result = new ActionRes<ChannelConfiguration>();

            result.item = await channelConfigurationService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<ChannelConfiguration>>> Save(ActionReq<ChannelConfiguration> req)
        {
            ActionRes<ChannelConfiguration> result = new ActionRes<ChannelConfiguration>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await channelConfigurationService.Update(req.item);
            }else{
                result.item = await channelConfigurationService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ChannelConfigurationDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await channelConfigurationService.Delete(req.item);

            return Ok(result);
        }
    }
}
