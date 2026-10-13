using Microsoft.AspNetCore.Mvc;
using CrmAppointza.Services;
using CrmAppointza.Utils;
using CrmAppointza.ViewModels;
using CrmAppointza.Models;
using Amazon.Util.Internal.PlatformServices;


namespace CrmAppointza.ViewComponents
{
    public class AppHeaderViewComponent : ViewComponent
    {
        private RequestState _requestState;
        
        public AppHeaderViewComponent(RequestState requestState)
        {
            _requestState = requestState;
           
        }
        public async Task<IViewComponentResult> InvokeAsync()
        {
            AppHeaderViewModel data = new AppHeaderViewModel();
           
            return View(data);
        }
    }
}
