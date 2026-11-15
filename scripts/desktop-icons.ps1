Add-Type -AssemblyName System.Drawing
function New-PlannerIcon([string]$Color, [string]$Destination) {
    $bitmap = New-Object System.Drawing.Bitmap 64,64
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = 'AntiAlias'
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Color))
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White),5
    $graphics.FillEllipse($brush, 2, 2, 60, 60)
    $graphics.DrawLines($pen, [System.Drawing.Point[]]@((New-Object System.Drawing.Point 15,29),(New-Object System.Drawing.Point 32,14),(New-Object System.Drawing.Point 49,29)))
    $graphics.DrawLines($pen, [System.Drawing.Point[]]@((New-Object System.Drawing.Point 20,28),(New-Object System.Drawing.Point 20,49),(New-Object System.Drawing.Point 44,49),(New-Object System.Drawing.Point 44,28)))
    $graphics.DrawRectangle($pen, 29, 36, 7, 13)
    # PNG-in-ICO keeps alpha transparency and avoids unmanaged HICON handles.
    $png = New-Object System.IO.MemoryStream
    $bitmap.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $png.ToArray()
    $stream = [System.IO.File]::Create($Destination)
    $writer = New-Object System.IO.BinaryWriter $stream
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
    $writer.Write([byte]64); $writer.Write([byte]64); $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$bytes.Length); $writer.Write([uint32]22)
    $writer.Write($bytes)
    $writer.Dispose(); $png.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $brush.Dispose(); $pen.Dispose()
}
