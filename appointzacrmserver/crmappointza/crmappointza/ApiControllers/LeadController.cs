using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class LeadController : ControllerBase
    {
        ILogger<LeadController> logger;
        LeadService leadService;

        public LeadController(ILogger<LeadController> logger, LeadService leadService)
        {
            this.logger = logger;
            this.leadService = leadService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Lead>>> Entity()
        {
            ActionRes<Lead> result = new ActionRes<Lead>()
            {
               item = new Lead()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Lead>>>> Select(ActionReq<LeadSelectReq> req)
        {
            ActionRes<List<Lead>> result = new ActionRes<List<Lead>>();

            result.item = await leadService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Lead>>> Insert(ActionReq<Lead> req)
        {
            ActionRes<Lead> result = new ActionRes<Lead>();

            result.item = await leadService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Lead>>> Update(ActionReq<Lead> req)
        {
            ActionRes<Lead> result = new ActionRes<Lead>();

            result.item = await leadService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Lead>>> Save(ActionReq<Lead> req)
        {
            ActionRes<Lead> result = new ActionRes<Lead>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await leadService.Update(req.item);
            }else{
                result.item = await leadService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<LeadDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await leadService.Delete(req.item);

            return Ok(result);
        }

        [HttpPost("BulkInsert")]
        public async Task<ActionResult<ActionRes<LeadBulkInsertRes>>> BulkInsert(ActionReq<LeadBulkInsertReq> req)
        {
            return Ok(new ActionRes<LeadBulkInsertRes>
            {
                item = await leadService.BulkInsertWithConnectDefaults(req.item.organizationid, req.item.items ?? new List<Lead>())
            });
        }

        [HttpPost("Transition")]
        public async Task<ActionResult<ActionRes<Lead>>> Transition(ActionReq<LeadTransitionReq> req)
        {
            return Ok(new ActionRes<Lead>
            {
                item = await leadService.Transition(req.item.id, req.item.toType, req.item.reason, req.item.byUserId)
            });
        }

        [HttpPost("AddNote")]
        public async Task<ActionResult<ActionRes<Lead>>> AddNote(ActionReq<LeadAddNoteReq> req)
        {
            return Ok(new ActionRes<Lead>
            {
                item = await leadService.AddNote(req.item.id, req.item.text, req.item.byUserId)
            });
        }
    }
}
