using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class ApiKeyController : ControllerBase
    {
        ILogger<ApiKeyController> logger;
        ApiKeyService apiKeyService;

        public ApiKeyController(ILogger<ApiKeyController> logger, ApiKeyService apiKeyService)
        {
            this.logger = logger;
            this.apiKeyService = apiKeyService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<ApiKey>>> Entity()
        {
            ActionRes<ApiKey> result = new ActionRes<ApiKey>()
            {
               item = new ApiKey()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<ApiKey>>>> Select(ActionReq<ApiKeySelectReq> req)
        {
            ActionRes<List<ApiKey>> result = new ActionRes<List<ApiKey>>();

            result.item = await apiKeyService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<ApiKey>>> Insert(ActionReq<ApiKey> req)
        {
            ActionRes<ApiKey> result = new ActionRes<ApiKey>();

            result.item = await apiKeyService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<ApiKey>>> Update(ActionReq<ApiKey> req)
        {
            ActionRes<ApiKey> result = new ActionRes<ApiKey>();

            result.item = await apiKeyService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<ApiKey>>> Save(ActionReq<ApiKey> req)
        {
            ActionRes<ApiKey> result = new ActionRes<ApiKey>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await apiKeyService.Update(req.item);
            }else{
                result.item = await apiKeyService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ApiKeyDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await apiKeyService.Delete(req.item);

            return Ok(result);
        }
    }
}
