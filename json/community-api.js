/* HNBC 社区 - 前端接口层（对接纳棂 CloudBase 环境里的 hnapi 云函数） */
(function (global) {
  'use strict';

  // hnapi 部署后的 HTTP 访问地址（与纳棂 api 同一环境的域名，仅函数名不同）
  // 拆分拼接，提升被直接复制滥用的门槛；真正防护靠后端 token 鉴权（见后端文档）
  var _apiParts = [
    'https://naling-sql-',
    'd8go4z9v64d3cd083',
    '.service.tcloudbase.com/hnapi'
  ];
  var API_BASE = _apiParts.join('');

  var TOKEN_KEY = 'hn_open_token';
  var PROFILE_KEY = 'hn_open_profile';

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }
  function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch (e) { return null; }
  }
  function setProfile(p) {
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_KEY);
  }

  function request(path, opts) {
    opts = opts || {};
    var url = API_BASE + path;
    var init = {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    var tk = getToken();
    if (tk) init.headers['Authorization'] = 'Bearer ' + tk;
    if (opts.body) init.body = JSON.stringify(opts.body);

    return fetch(url, init).then(function (r) {
      return r.text().then(function (txt) {
        var data;
        try { data = JSON.parse(txt); } catch (e) { data = { ok: false, error: '返回格式异常' }; }
        if (r.status === 401) { setToken(''); setProfile(null); }
        return data;
      });
    }).catch(function (e) {
      return { ok: false, error: '网络错误，请确认后端已部署 (' + e.message + ')' };
    });
  }

  var API = {
    API_BASE: API_BASE,
    getToken: getToken, setToken: setToken, getProfile: getProfile, setProfile: setProfile,
    isLogin: function () { return !!getToken(); },

    sendCode: function (email) { return request('/open-auth/send-code', { method: 'POST', body: { email: email } }); },
    login: function (email, code) {
      return request('/open-auth/login', { method: 'POST', body: { email: email, code: code } }).then(function (r) {
        if (r.ok && r.token) { setToken(r.token); setProfile(r.profile); }
        return r;
      });
    },
    logout: function () { setToken(''); setProfile(null); },

    listPosts: function (board, page, pageSize) {
      var q = '?page=' + (page || 1) + '&pageSize=' + (pageSize || 12);
      if (board && board !== 'all') q += '&board=' + board;
      return request('/open-posts' + q);
    },
    createPost: function (board, title, content) {
      return request('/open-posts', { method: 'POST', body: { board: board, title: title, content: content } });
    },
    postDetail: function (id) { return request('/open-posts/detail?id=' + encodeURIComponent(id)); },
    addComment: function (postId, content) {
      return request('/open-comments', { method: 'POST', body: { postId: postId, content: content } });
    },
    like: function (postId) { return request('/open-like', { method: 'POST', body: { postId: postId } }); },
    profile: function () { return request('/open-profile'); },
    updateProfile: function (nickname, avatar) {
      return request('/open-profile', { method: 'PUT', body: { nickname: nickname, avatar: avatar } }).then(function (r) {
        if (r.ok && r.profile) setProfile(r.profile);   // 同步刷新本地缓存，避免"改了没用"
        return r;
      });
    },

    // 头像上传：dataURL(base64) → 后端存云存储 → 返回可访问 URL
    uploadAvatar: function (dataUrl) { return request('/open-upload', { method: 'POST', body: { data: dataUrl } }); },

    // ---------- 管理员接口（仅 isAdmin 可调用，后端二次校验） ----------
    // 列出所有管理员（返回脱敏的邮箱前缀，不返回明文）
    adminList: function () { return request('/open-admin/list'); },
    // 按邮箱增加管理员（无数量上限；调用者自身须为管理员）
    adminAdd: function (email) { return request('/open-admin/add', { method: 'POST', body: { email: email } }); },
    // 删除帖子（管理员；普通用户只能删自己的）
    deletePost: function (postId) { return request('/open-posts/delete', { method: 'POST', body: { postId: postId } }); },
    // 删除评论（管理员；普通用户只能删自己的）
    deleteComment: function (commentId) { return request('/open-comments/delete', { method: 'POST', body: { commentId: commentId } }); },

    // GitHub Issue / 招聘邮箱（前端跳转，不依赖后端）
    githubIssueUrl: 'https://github.com/OPENHNBC/HNBCTeam/issues/new',
    recruitEmail: 'furrynaling@outlook.com'
  };

  global.HNCommunity = API;
})(window);
