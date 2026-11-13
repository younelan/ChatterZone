<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{site_name}</title>
    <link rel="stylesheet" href="{themepath}/screen.css">
</head>
<body>
<div class="simple-container">
    <header class="simple-header">
        <div class="simple-brand">
            <a href="/"><strong>{site_name}</strong> - <span>{site_motto}</span></a>
        </div>
        <nav class="simple-utility">
            <ul>
                {utility_menu}
            </ul>
        </nav>
    </header>

    <div class="simple-layout">
        <main id="content">
            {content}
        </main>
        <aside id="sidebar">
            <div class="simple-sidebar-section">
                <h4>Menu</h4>
                {sidebar1}
            </div>
        </aside>
    </div>
</div>
</body>
</html>