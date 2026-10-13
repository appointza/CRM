using CrmAppointza.Models;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Controllers.CrmAppointza
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        ILogger<UserController> logger;
        UserService userService;

        public UserController(ILogger<UserController> logger, UserService userService)
        {
            this.logger = logger;
            this.userService = userService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<User>>> Entity()
        {
            ActionRes<User> result = new ActionRes<User>()
            {
               item = new User()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<User>>>> Select(ActionReq<UserSelectReq> req)
        {
            ActionRes<List<User>> result = new ActionRes<List<User>>();

            result.item = await userService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<User>>> Insert(ActionReq<User> req)
        {
            ActionRes<User> result = new ActionRes<User>();

            result.item = await userService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<User>>> Update(ActionReq<User> req)
        {
            ActionRes<User> result = new ActionRes<User>();

            result.item = await userService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<User>>> Save(ActionReq<User> req)
        {
            ActionRes<User> result = new ActionRes<User>();

            if(!string.IsNullOrWhiteSpace(req.item.id)){
                result.item = await userService.Update(req.item);
            }else{
                result.item = await userService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<UserDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await userService.Delete(req.item);

            return Ok(result);
        }

        [HttpPost("Login")]
        public async Task<ActionResult<ActionRes<UserLoginRes>>> Login(ActionReq<UserLoginReq> req)
        {
            ActionRes<UserLoginRes> result = new ActionRes<UserLoginRes>();

            result.item = await userService.Login(req.item);

            return Ok(result);
        }

        [HttpPost("LoginWithMobile")]
        public async Task<ActionResult<ActionRes<UserLoginRes>>> LoginWithMobile(ActionReq<UserMobileLoginReq> req)
        {
            ActionRes<UserLoginRes> result = new ActionRes<UserLoginRes>();
            result.item = await userService.LoginWithMobile(req.item);
            return Ok(result);
        }

        [HttpPost("UpdateProfile")]
        public async Task<ActionResult<ActionRes<UserLoginRes>>> UpdateProfile(ActionReq<UserProfileUpdateReq> req)
        {
            ActionRes<UserLoginRes> result = new ActionRes<UserLoginRes>();
            result.item = await userService.UpdateProfile(req.item);
            return Ok(result);
        }
    }
}
