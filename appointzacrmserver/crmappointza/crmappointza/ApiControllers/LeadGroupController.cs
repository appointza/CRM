using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class LeadGroupController : ControllerBase
    {
        ILogger<LeadGroupController> logger;
        LeadGroupService leadGroupService;

        public LeadGroupController(ILogger<LeadGroupController> logger, LeadGroupService leadGroupService)
        {
            this.logger = logger;
            this.leadGroupService = leadGroupService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<LeadGroup>>> Entity()
        {
            ActionRes<LeadGroup> result = new ActionRes<LeadGroup>()
            {
               item = new LeadGroup()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<LeadGroup>>>> Select(ActionReq<LeadGroupSelectReq> req)
        {
            ActionRes<List<LeadGroup>> result = new ActionRes<List<LeadGroup>>();

            result.item = await leadGroupService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<LeadGroup>>> Insert(ActionReq<LeadGroup> req)
        {
            ActionRes<LeadGroup> result = new ActionRes<LeadGroup>();

            result.item = await leadGroupService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<LeadGroup>>> Update(ActionReq<LeadGroup> req)
        {
            ActionRes<LeadGroup> result = new ActionRes<LeadGroup>();

            result.item = await leadGroupService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<LeadGroup>>> Save(ActionReq<LeadGroup> req)
        {
            ActionRes<LeadGroup> result = new ActionRes<LeadGroup>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await leadGroupService.Update(req.item);
            }else{
                result.item = await leadGroupService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<LeadGroupDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await leadGroupService.Delete(req.item);

            return Ok(result);
        }
    }
}
