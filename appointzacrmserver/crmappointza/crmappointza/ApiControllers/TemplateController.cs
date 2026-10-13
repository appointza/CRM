using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class TemplateController : ControllerBase
    {
        ILogger<TemplateController> logger;
        TemplateService templateService;

        public TemplateController(ILogger<TemplateController> logger, TemplateService templateService)
        {
            this.logger = logger;
            this.templateService = templateService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Template>>> Entity()
        {
            ActionRes<Template> result = new ActionRes<Template>()
            {
               item = new Template()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Template>>>> Select(ActionReq<TemplateSelectReq> req)
        {
            ActionRes<List<Template>> result = new ActionRes<List<Template>>();

            result.item = await templateService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Template>>> Insert(ActionReq<Template> req)
        {
            ActionRes<Template> result = new ActionRes<Template>();

            result.item = await templateService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Template>>> Update(ActionReq<Template> req)
        {
            ActionRes<Template> result = new ActionRes<Template>();

            result.item = await templateService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Template>>> Save(ActionReq<Template> req)
        {
            ActionRes<Template> result = new ActionRes<Template>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await templateService.Update(req.item);
            }else{
                result.item = await templateService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<TemplateDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await templateService.Delete(req.item);

            return Ok(result);
        }
    }
}
