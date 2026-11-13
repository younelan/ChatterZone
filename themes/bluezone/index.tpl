<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{site_name}</title>
    <link rel="stylesheet" href="{themepath}/index.css">
</head>
<body>
<div id="wrapper">
    <!-- Cool Modern Navigation Header (Only utility on top to prevent duplicates) -->
    <header class="header">
        <div class="brand-bar">
            <a href="/" class="site-brand">
                <span class="brand-icon">⚡</span>
                <div class="brand-text">
                    <span class="site-title">{site_name}</span>
                    <span class="site-motto">{site_motto}</span>
                </div>
            </a>
        </div>
        <nav class="header-utility">
            <ul>
                {utility_menu}
            </ul>
        </nav>
    </header>

    {banner_insert}

    <!-- Main Content & Sidebar -->
    <div class="main-body-row">
        <div id="content">
            {content}
        </div>
        <aside class="sidebarDiv">
            <div class="sidebar-box">
                <div class="sidebar-box-header">Navigation</div>
                <div class="sidebar-box-body">
                    {sidebar1}
                </div>
            </div>
        </aside>
    </div>
</div>
</body>
</html>