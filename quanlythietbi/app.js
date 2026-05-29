const SUPABASE_URL = "https://vogwnclvqrekjcrdotgh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HzbZ0eaKqZqumOIV7OOiog_RUtf3ql6";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabaseClient;

if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
  checkUserSession();
}

async function checkUserSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();

  if (!session || error) {
    window.location.href = 'login.html';
    return;
  }

  if (session.user.email !== "quanpm.25it@vku.udn.vn") {
    window.location.href = 'client.html';
    return;
  }

  const userEmailElement = document.getElementById('user-email');
  if (userEmailElement) userEmailElement.innerText = session.user.email;
}

async function dangXuat() {
  const { error } = await supabaseClient.auth.signOut();
  if (!error) window.location.href = 'login.html';
  else alert("Có lỗi xảy ra khi đăng xuất: " + error.message);
}

function showSection(sectionName) {
  const homeSection = document.getElementById('section-home');
  const dashboardSection = document.getElementById('section-dashboard');

  if (sectionName === 'home') {
    if (homeSection) homeSection.classList.remove('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');
  } else if (sectionName === 'dashboard') {
    if (homeSection) homeSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
    taiDanhSachThietBi();
  }
}

async function taiDanhSachThietBi() {
  const tableBody = document.getElementById('equipment-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Đang tải dữ liệu từ hệ thống...</td></tr>`;

  const { data: danhSach, error } = await supabaseClient
    .from('thiet_bi')
    .select('*')
    .order('ma_tb', { ascending: true });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
    return;
  }

  capNhatThongKe(danhSach);

  if (danhSach.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Hệ thống chưa có thiết bị nào.</td></tr>`;
    return;
  }

  tableBody.innerHTML = '';
  danhSach.forEach(tb => {
    let statusStyle = '';
    if (tb.trang_thai === 'Sẵn sàng') statusStyle = 'background-color: #ecfdf5; color: #047857; padding: 6px 12px; border-radius: 8px; font-size:12px; font-weight:600;';
    if (tb.trang_thai === 'Đang cho mượn') statusStyle = 'background-color: #eff6ff; color: #1d4ed8; padding: 6px 12px; border-radius: 8px; font-size:12px; font-weight:600;';
    if (tb.trang_thai === 'Đang hỏng') statusStyle = 'background-color: #fff5f5; color: #be123c; padding: 6px 12px; border-radius: 8px; font-size:12px; font-weight:600;';

    const tr = document.createElement('tr');
    const tbDataEscaped = encodeURIComponent(JSON.stringify(tb));

    tr.innerHTML = `
      <td><strong>${tb.ma_tb}</strong></td>
      <td>${tb.ten_tb}</td>
      <td>${tb.loai_tb || '-'}</td>
      <td>${tb.vi_tri || '-'}</td>
      <td><span style="${statusStyle}">${tb.trang_thai || 'Sẵn sàng'}</span></td>
      <td style="text-align: center; gap: 10px; display: flex; justify-content: center;">
        <button onclick="moModalSua('${tbDataEscaped}')" style="background:none; border:none; color:#f59e0b; cursor:pointer; font-weight:600;">✏️ Sửa</button>
        <span style="color: #ddd;">|</span>
        <button onclick="xoaThietBi('${tb.id}')" style="background:none; border:none; color:#be123c; cursor:pointer; font-weight:600;">🗑️ Xóa</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function capNhatThongKe(danhSach) {
  const totalEl = document.getElementById('stat-total');
  const readyEl = document.getElementById('stat-ready');
  const borrowedEl = document.getElementById('stat-borrowed');
  const brokenEl = document.getElementById('stat-broken');

  if (totalEl) totalEl.innerText = danhSach.length;
  if (readyEl) readyEl.innerText = danhSach.filter(tb => tb.trang_thai === 'Sẵn sàng').length;
  if (borrowedEl) borrowedEl.innerText = danhSach.filter(tb => tb.trang_thai === 'Đang cho mượn').length;
  if (brokenEl) brokenEl.innerText = danhSach.filter(tb => tb.trang_thai === 'Đang hỏng').length;
}

document.getElementById('form-thiet-bi')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('.btn-save');
  const oldText = btn.innerText;

  btn.innerText = "Đang lưu...";
  btn.disabled = true;

  const { error } = await supabaseClient
    .from('thiet_bi')
    .insert([{
      "ma_tb": document.getElementById('input-ma').value.trim(),
      "ten_tb": document.getElementById('input-ten').value.trim(),
      "loai_tb": document.getElementById('input-loai').value.trim(),
      "vi_tri": document.getElementById('input-vi-tri').value.trim(),
      "trang_thai": document.getElementById('input-trang-thai').value
    }]);

  btn.innerText = oldText;
  btn.disabled = false;

  if (error) {
    alert("Lỗi khi thêm thiết bị: " + error.message);
  } else {
    dongModal();
    await taiDanhSachThietBi();
    showSection('dashboard');
  }
});

document.getElementById('form-sua-thiet-bi')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('.btn-update');
  const oldText = btn.innerText;

  btn.innerText = "Đang cập nhật...";
  btn.disabled = true;

  const { error } = await supabaseClient
    .from('thiet_bi')
    .update({
      "ma_tb": document.getElementById('edit-ma').value.trim(),
      "ten_tb": document.getElementById('edit-ten').value.trim(),
      "loai_tb": document.getElementById('edit-loai').value.trim(),
      "vi_tri": document.getElementById('edit-vi-tri').value.trim(),
      "trang_thai": document.getElementById('edit-trang-thai').value
    })
    .eq('id', document.getElementById('edit-id').value);

  btn.innerText = oldText;
  btn.disabled = false;

  if (error) {
    alert("Không thể cập nhật thông tin: " + error.message);
  } else {
    dongModalSua();
    await taiDanhSachThietBi();
  }
});

async function xoaThietBi(id) {
  if (confirm("Bạn có chắc chắn muốn xóa thiết bị này khỏi hệ thống không?")) {
    const { error } = await supabaseClient.from('thiet_bi').delete().eq('id', id);
    if (error) alert("Lỗi khi thực hiện xóa: " + error.message);
    else taiDanhSachThietBi();
  }
}

document.getElementById('global-search')?.addEventListener('input', function(e) {
  const keyword = e.target.value.toLowerCase().trim();

  const dashboardSection = document.getElementById('section-dashboard');
  if (dashboardSection && dashboardSection.classList.contains('hidden')) {
    showSection('dashboard');
  }

  const rows = document.querySelectorAll('#equipment-table-body tr');

  rows.forEach(row => {

    if (row.cells.length === 1) return;

    const match = Array.from(row.cells).slice(0, 4).some(cell => {
      return cell.textContent.toLowerCase().includes(keyword);
    });

    row.style.display = match ? '' : 'none';
  });
});

function moModal() { document.getElementById('modal-them').classList.remove('hidden'); }
function dongModal() { document.getElementById('modal-them').classList.add('hidden'); document.getElementById('form-thiet-bi').reset(); }

function moModalSua(encodedData) {
  const tb = JSON.parse(decodeURIComponent(encodedData));
  document.getElementById('edit-id').value = tb.id;
  document.getElementById('edit-ma').value = tb.ma_tb;
  document.getElementById('edit-ten').value = tb.ten_tb;
  document.getElementById('edit-loai').value = tb.loai_tb || '';
  document.getElementById('edit-vi-tri').value = tb.vi_tri || '';
  document.getElementById('edit-trang-thai').value = tb.trang_thai || 'Sẵn sàng';
  document.getElementById('modal-sua').classList.remove('hidden');
}
function dongModalSua() { document.getElementById('modal-sua').classList.add('hidden'); document.getElementById('form-sua-thiet-bi').reset(); }

function toggleMobileMenu() {
  if (window.innerWidth <= 768) {
    const navCenter = document.getElementById('navCenter');
    if (navCenter) {
      navCenter.classList.toggle('mobile-active');
    }
  }
}
