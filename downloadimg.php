<?php
/**
 * linuxer wget -x -i down_4.txt --user-agent="Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/534.16 (KHTML, like Gecko) Chrome/10.0.648.204 Safari/534.16"
*/
$handle = fopen ("down_4.txt", "rb");
$base_dir = realpath(dirname(__FILE__));
$base_url = 'http://images.qtravel.com/';

echo '<pre>';
while (!feof($handle)) 
{
    $url = fgets($handle, 4096);
    $save_name = str_replace(array($base_url, "\n"), '', $url);
    $save_file_path = $base_dir . '\down\\' . $save_name . ".jpg";
    
    if (!file_exists(dirname($save_file_path)))
    {
        mkdirs(dirname($save_file_path));
    }
    $imgdata = file_get_contents($url);
    file_put_contents($save_file_path, $imgdata);
    print_r($save_file_path);
    print "\n";
}
fclose($handle);



function mkdirs($dir,$mode=0777){
    if(is_dir($dir)||@mkdir($dir,$mode)){
        return true;
    }
    if(!mkdirs(dirname($dir),$mode)){
        return false;
    }
    return @mkdir($dir,$mode);
}
