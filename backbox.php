<?php
/**
 * 备份工具
 *
 * $Id$
 * $Author$
 * $Revision$ 
 * $LastChangedDate$ 
 *
 */
function get_backup_list($date='')
{
	$backup_list = array();
	$base_time = strtotime($date);
	if(empty($date))
	{
		$base_time  = strtotime(date('Y-m-d'));
	}
	$base_date = date('Y-m-d',$base_time);
	$time_flag = $base_time;
	$all_len = 0;

	$week = date('w', $base_time);
	//获取增量备份时间点
	for($i=0; $i<$week; $i++)
	{
		$backup = array('date'=>'', 'type'=>'incremental', 'len'=>1,'msg'=>'增量日备份');
		$backup['date'] = date('Y-m-d',$base_time-$i*86400);
		$backup_list[] = $backup;
		$all_len += $backup['len'];
	}
	$time_flag -= 86400*$week;
	//每周完备4周
	for($i=0; $i<4; $i++)
	{
		$backup = array('date'=>'', 'type'=>'full', 'len'=>'2','msg'=>'周完全备份');
		$backup['date'] = date('Y-m-d', $time_flag-$i*86400*7);
		$backup_list[] = $backup;
		$all_len += $backup['len'];
	}
	$time_flag -= 86400*28;
	$year  = date('Y', $time_flag);
	$month = date('n', $time_flag);
	$first_backup_time = strtotime("$year-$month-01");
	//获取前三个月的完整备份
	for($i=0; $i<3; $i++)
	{
		$temp_backup_time =$first_backup_time - $i*86400*30;
		$t_y = date('Y', $temp_backup_time);
		$t_m = date('m', $temp_backup_time);
		$backup_time = strtotime("$t_y-$t_m-01");
		$backup = array('date'=>'', 'type'=>'full', 'len'=>'4','msg'=>'月完全备份');
		for($j=0; $j<7; $j++)
		{
			if(0 == date('w', $backup_time+ $j*86400))
			{
				$backup['date'] =  date('Y-m-d',$backup_time + $j*86400);
				break;
			}
		}
		$backup_list[] = $backup;
		$all_len += $backup['len'];
	}
	$_RE = array('sum'=>$all_len);
	$_RE['backup'] =  $backup_list;
	return $_RE;
}
$backup_list = get_backup_list();
krsort($backup_list['backup']);

?>
<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>备份工具</title>
<meta name="Keywords" content="" />
<meta name="Description" content="" />
<style type="text/css">
html,body,div,p,span,img,a,h1,h2,h3,h4,h6,h5,ul,li{padding:0;margin:0;}
body{font-family: Tahoma,宋体,Helvetica,Sans-Serif,Simsun;background:#EEE;font-size:12px;}
.wrap{text-align:center;padding:10px;color:#333;background:#EEE;}
#main{border:1px solid #999;height:auto;margin:0 auto;width:90%;background:#FFF;}
h1{font-size:20px;padding:10px;font-weight:bold;}
#step_one{min-height:300px;overflow:hidden;text-align:left;}
#step_one{text-align:left;padding:10px;height:500px;}
#time_now{font-size:25px;font-weight:bold;}
#back_daojishi{font-size:50px;}
.clear{clear:both;}
ul,li{list-style:none;}
.tables_ul{list-style:none;display:block;border-bottom:2px solid #666;height:40px;padding:0 10px;}
.tables_ul li{display:block;float:left;padding-left:2px;border-left:2px solid red;height:40px;width:100%;line-height:20px;}
.tables_ul li a{color:#FFF;}
.tables_ul li.li_1{background-color:#2B5797;line-height:40px;}
.tables_ul li.li_2{background-color:#2D89EF;}
.tables_ul li.li_4{background-color:#008287;}
#show_backup_info{margin:10px;border:1px solid #D6E9C6; background:#DFF0D8;padding:8px 14px;border-radius:5px;display:block;line-height:20px;}
a{text-decoration:none;}
.MBox{margin:5px 5px 2px 2px;padding:5px;}
.green{background: none repeat scroll 0 0 #91D100;}
#show_backup_list{padding:5px;border:1px solid #AAA;margin-top:20px;}
#backup_recover{padding:50px;margin-top:20px;text-align:center;}
.bt{font-size:30px;}
#backup{margin-right:200px;}
#recover{color:red;}
</style>
</head>
<body>
<div class="wrap">
	<div id="main">
		<h1>备份计划系统</h1>
		<hr />
		<div id="step_one">
			<div id="time_now" class="MBox">
				<div style="float:left;width:49%;text-align:right;">
				现在时间:
				<span id="date"></span>
				<span id="time"></span>
				</div>
				<div style="float:right;width:49%">
				下次备份:
				<span id="next_back_time"></span>
				</div>
				<br class="clear"/>
			</div>
			<div class="MBox green" style="width:200px;height:80px;margin:0 auto;">
				距离下次备份还有<br/>
				<span id="back_daojishi">00:00:00</span>
			</div>
			<div id="show_backup_list">
				<h2>备份点</h2>
				<ul class="tables_ul">
				<?php
					foreach($backup_list['backup'] as $key=>$backup)
					{
						$width = intval($backup['len']*100/$backup_list['sum']);
						if($key+1 == count($backup_list['backup']))
						{
							$width = intval($backup['len']*100/$backup_list['sum'])-1;
						}
						$html = '<li style="width:'. $width .'%" class="li_'.$backup['len'].'">';
						if($backup['len'] == 1){
							$html .= "<a href=\"javascript:void(0);\" title=\"{$backup['date']}{$backup['msg']}\">增备</a>";
						}else{
							$html .= "<a href=\"javascript:void(0);\" >{$backup['date']}<br/>{$backup['msg']}</a>";
						}
						$html .= '</li>';
						echo $html;
					}
				?>
				</ul>
				<br class="clear"/>
			</div>
			<div id="show_backup_info">
				2013-09-23日增量备份<br/>
				文件大小: 512M<br/>
				传输所需时间: 50分钟
			</div>
			<div id="backup_recover">
				<input type="button" value="立即备份" onclick="backup();" class="bt" id="backup">
				<input type="button" value="立即还原" onclick="recover();" class="bt" id="recover">
			</div>
		</div>
	</div>
</div>
<script type="text/javascript">
function backup(){
	var msg = '是否要执行增量备份?';
	if(!confirm(msg))
	{
		return false;
	}
	alert('系统正在备份');
}
function recover(){
	var msg = '是否要执行还原操作?';
	if(!confirm(msg)){
		return false;
	}
	alert('系统正在还原');
}
function getdate(day){
	if (day>=10){
		return day;
	}else{
		return "0" + day + "";
	}
}
var g_next_back_time = 0;
function showtime(){
	var time_now = document.getElementById('date');
	var date = new Date();
	var _day = date.getFullYear()+'-'+ getdate(date.getMonth()+1)+'-'+getdate(date.getDate());
	var _time = getdate(date.getHours())+'-'+ getdate(date.getMinutes())+'-'+ getdate(date.getSeconds());
	document.getElementById('date').innerHTML = _day;
	document.getElementById('time').innerHTML =_time;
	setTimeout("showtime()",1000);
	var leave = (g_next_back_time - date.getTime());
	if(leave <=0 ){
		show_next_back_time();
	}else{
		var day = Math.floor(leave / (1000 * 60 * 60 * 24));
		var hour = Math.floor(leave / (1000*3600)) - (day * 24);
		var minute = Math.floor(leave / (1000*60)) - (day * 24 *60) - (hour * 60);
		var second = Math.floor(leave / (1000)) - (day * 24 *60*60) - (hour * 60 * 60) - (minute*60);
		document.getElementById('back_daojishi').innerHTML = getdate(hour)+':'+getdate(minute)+':'+getdate(second);
	}
}
function show_next_back_time(){
	var date = new Date();
	var year  = date.getFullYear();
	var month = date.getMonth();
	var day   = date.getDate();
	var back_time = new Date(year+'/'+(month+1)+'/'+(day+1));
	g_next_back_time = back_time.getTime();
	var next_time = back_time.getFullYear() +'-'+getdate(back_time.getMonth()+1)+'-'+getdate(back_time.getDate());
	next_time += ' '+getdate(back_time.getHours())+'-'+ getdate(back_time.getMinutes())+'-'+ getdate(back_time.getSeconds());
	document.getElementById('next_back_time').innerHTML =next_time;
}
showtime();
show_next_back_time();
</script>
</body>
</html>
