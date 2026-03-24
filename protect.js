// Finorix Pro - Security Protection Layer
// Prevents source code inspection, DevTools, and content copying

(function() {
    'use strict';

    // ===== 1. Disable Right-Click Context Menu =====
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // ===== 2. Disable Key Shortcuts (F12, Ctrl+Shift+I/J/C/U, Ctrl+U, Ctrl+S) =====
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.keyCode === 123) { e.preventDefault(); return false; }
        // Ctrl+Shift+I (DevTools)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) { e.preventDefault(); return false; }
        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) { e.preventDefault(); return false; }
        // Ctrl+Shift+C (Inspect Element)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) { e.preventDefault(); return false; }
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
        // Ctrl+S (Save Page)
        if (e.ctrlKey && e.keyCode === 83) { e.preventDefault(); return false; }
        // Ctrl+Shift+K (Firefox Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 75) { e.preventDefault(); return false; }
        // Ctrl+Shift+M (Responsive Design)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 77) { e.preventDefault(); return false; }
        // F5 + Ctrl (Hard Refresh with DevTools)
        if (e.ctrlKey && e.keyCode === 116) { e.preventDefault(); return false; }
    });

    // ===== 3. Disable Text Selection =====
    document.addEventListener('selectstart', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    });

    // ===== 4. Disable Drag =====
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // ===== 5. Disable Copy/Cut/Paste on non-input elements =====
    document.addEventListener('copy', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    });
    document.addEventListener('cut', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    });

    // ===== 6. DevTools Detection via debugger =====
    var _dc = 0;
    setInterval(function() {
        var s = performance.now();
        debugger;
        if (performance.now() - s > 100) {
            _dc++;
            if (_dc > 2) {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#ff1493;font-family:sans-serif;text-align:center;padding:20px;"><div><h1 style="font-size:28px;">Access Denied</h1><p style="color:rgba(255,255,255,0.5);margin-top:10px;">Developer tools are not allowed.</p></div></div>';
            }
        }
    }, 1000);

    // ===== 7. Console Warning =====
    var _w = '%c⚠ WARNING!';
    var _m = '%cThis is a protected application. Unauthorized access to source code is prohibited.';
    try {
        console.log(_w, 'color:#ff1493;font-size:40px;font-weight:900;text-shadow:2px 2px 0 #c71585;');
        console.log(_m, 'color:#ff6b6b;font-size:16px;font-weight:600;');
        console.log('%cIf someone told you to paste something here, it\'s a scam.', 'color:#ffa726;font-size:14px;');
    } catch(e) {}

    // ===== 8. Override console methods =====
    var _noop = function() {};
    var _consoleMethods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count', 'assert', 'profile', 'profileEnd', 'time', 'timeEnd', 'timeStamp'];
    
    setTimeout(function() {
        _consoleMethods.forEach(function(method) {
            try { console[method] = _noop; } catch(e) {}
        });
    }, 2000);

    // ===== 9. Detect window resize (DevTools docking) =====
    var _threshold = 160;
    var _lastW = window.outerWidth;
    var _lastH = window.outerHeight;
    
    setInterval(function() {
        var wDiff = window.outerWidth - window.innerWidth;
        var hDiff = window.outerHeight - window.innerHeight;
        if (wDiff > _threshold || hDiff > _threshold) {
            // DevTools likely open (docked)
        }
        _lastW = window.outerWidth;
        _lastH = window.outerHeight;
    }, 500);

    // ===== 10. Disable print =====
    window.addEventListener('beforeprint', function() {
        document.body.style.display = 'none';
    });
    window.addEventListener('afterprint', function() {
        document.body.style.display = '';
    });

    // ===== 11. CSS-based protection =====
    var protectStyle = document.createElement('style');
    protectStyle.textContent = '* { -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; user-select: none !important; } input, textarea { -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; user-select: text !important; } @media print { body { display: none !important; } }';
    document.head.appendChild(protectStyle);

})();
