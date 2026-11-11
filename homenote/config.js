// 사이트 설정: 출시 후 스토어 주소와 문의 메일만 채우면 모든 페이지에 반영된다
window.SITE = {
  appStoreUrl: '', // 예: https://apps.apple.com/kr/app/id0000000000
  playStoreUrl: '', // 예: https://play.google.com/store/apps/details?id=com.darakstudio.familyos
  supportEmail: 'csparkzxc1@gmail.com',
};

// [data-store="ios|android"] 링크에 주소 채우기 (없으면 "곧 출시"로 비활성)
// [data-mail] 요소에 문의 메일 표시
document.addEventListener('DOMContentLoaded', () => {
  const s = window.SITE;
  document.querySelectorAll('[data-store]').forEach((a) => {
    const url = a.dataset.store === 'ios' ? s.appStoreUrl : s.playStoreUrl;
    if (url) a.href = url;
    else {
      a.setAttribute('aria-disabled', 'true');
      const small = a.querySelector('small');
      if (small) small.textContent = '곧 출시';
    }
  });
  document.querySelectorAll('[data-mail]').forEach((el) => {
    el.textContent = s.supportEmail;
  });
});
