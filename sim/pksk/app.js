(() => {
  const key = 'reqoo_pksk_v2_license';
  const access = localStorage.getItem(key);
  const accessLinks = document.querySelectorAll('a[href$="/access/"]');
  if (access) accessLinks.forEach(a => a.textContent = 'Dashboard / Akses');
})();
