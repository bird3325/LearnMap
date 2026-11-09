import fs from 'fs';

let content = fs.readFileSync('blog.html', 'utf8');

const targetRegex = /<footer class="footer-section">\s*<p>© 2026 학업여지도 \(LearnMap\)\. All rights reserved\. \| 공공데이터 포털 및 학교알리미 공식 공시자료 기반<\/p>\s*<\/footer>/;

const replacement = `<footer class="footer-section">
        <p style="margin-bottom: 6px;">
            <a href="/?view=terms" target="_blank" rel="noopener noreferrer" style="color: #94a3b8; text-decoration: none; margin-right: 8px;">이용약관</a>
            <span style="opacity: 0.3;">|</span>
            <a href="/?view=privacy" target="_blank" rel="noopener noreferrer" style="color: #cbd5e1; text-decoration: none; font-weight: 700; margin-left: 8px;">개인정보처리방침</a>
        </p>
        <p>© 2026 학업여지도 (LearnMap). All rights reserved. | 공공데이터 포털 및 학교알리미 공식 공시자료 기반</p>
    </footer>`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync('blog.html', content, 'utf8');
    console.log('Successfully updated blog.html footer!');
} else {
    console.log('blog footer regex did not match, trying plain string');
}
