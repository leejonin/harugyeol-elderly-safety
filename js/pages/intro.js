/**
 * 서비스 소개 페이지 초기화
 */
(function () {
  "use strict";
  var Common = window.Harugyeol.Common;
  Common.renderHeader("intro", document.getElementById("site-header"));
  var mount = document.getElementById("integration-mount");
  if (mount) {
    mount.className = "container";
    mount.innerHTML =
      '<section class="section"><h2>시연 연동 상태</h2>' +
      Common.renderIntegrationTags() +
      "</section>";
  }
})();
