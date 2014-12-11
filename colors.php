<!DOCTYPE HTML>
<html lang="en-US">
<head>
    <meta charset="UTF-8">
    <title>色彩实验</title>
    <meta name="Description" content="实验颜色的近似值,web安全色有215种,RGB采用三个256数字表示，总计可以表示1677万多色彩值。如果每个颜色按照51作为间隔分为6段，正好可以获取216中安全色。" />
<style type="text/css">
    li{
        float: left;
        list-style: none;
    }
    span{
        display:block;
        width: 65px;
        height: 65px;
        margin: 3px;
        color: red;
        border: 1px solid #000033;
        text-align: center;
    }
</style>
</head>
<body>
<div>
    <ul>
<?php
$start=26;
$max = 76;
$step= 3;
$l_r = 1;
$l_g = 1;
$l_b = 1;
for($r=$start; $r<$max; $r+=$step)
{
    $n_r = get_like($r);
    for ($g=$start; $g < $max ; $g+=$step)
    {
        $n_g = get_like($g);
        for ($b=$start; $b <$max ; $b+=$step)
        {   
            $n_b = get_like($b);
            $s= sprintf('%02X%02X%02X', $r,$g,$b);
            echo '<li><span style="background: #' . $s .'">'.$s.'</span></li>';
            $ns= sprintf('%02X%02X%02X', $n_r,$n_g,$n_b);
            echo '<li><span style="background: #' . $ns .'"#>'.$ns.'</span></li>';

            // if ($l_r!=$n_r or $l_b!=$n_g or $l_b!=$n_b)
            // {
            //     $l_r=$n_r;
            //     $l_b=$n_g;
            //     $l_b=$n_b;
            //     $s= sprintf('%02X%02X%02X', $n_r,$n_g,$n_b);
            //     echo '<li><span style="background: #' . $s .'">#'.$s.'</span></li>';
            // }
        }
    }
}
echo "OK";

function get_like($color='')
{
    $c = intval($color/51) * 51;
    $mod = $color % 51;
    if ($mod > 25)
    {
        $c = $c + 51;
    }
    return $c;
}
?>
    </ul>
</div>
</body>
</html>
