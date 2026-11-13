<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{site_name}</title>
    <!-- Authentic Bootstrap 4.5.2 -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="{themepath}/index.css">
</head>
<body class="bg-light">

    <!-- Bootstrap Navbar (Brand on left, Utility on right - No duplicates!) -->
    <nav class="navbar navbar-expand-md navbar-light bg-white border-bottom shadow-sm sticky-top">
        <div class="container">
            <a class="navbar-brand font-weight-bold text-primary d-flex align-items-center" href="/">
                <span class="badge badge-primary mr-2 px-2 py-1">⚡</span>
                <span>{site_name}</span>
            </a>
            <div class="d-flex align-items-center ml-auto">
                <ul class="navbar-nav flex-row align-items-center header-utility-nav">
                    {utility_menu}
                </ul>
            </div>
        </div>
    </nav>

    <!-- Main Container -->
    <div class="container my-4">
        {banner_insert}

        <!-- 2-Column Content & Sidebar Layout -->
        <div class="row">
            <!-- Main Content Area -->
            <div class="col-lg-8" id="content">
                {content}
            </div>

            <!-- Bootstrap Sidebar -->
            <div class="col-lg-4" id="sidebar">
                <!-- Navigation Menu Card -->
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-white font-weight-bold text-uppercase text-muted small py-3 border-bottom">
                        Navigation
                    </div>
                    <div class="card-body p-2 sidebar-menu-body">
                        {sidebar1}
                    </div>
                </div>

            </div>
        </div>
    </div>

    <!-- Bootstrap & jQuery Scripts -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>