<?php
/**
 * mysql 数据库备份工具
 *
 * $Id$
 * $Author$
 * $Revision$ 
 * $LastChangedDate$ 
 *
 */
$db_host = '192.168.1.1';
$db_port = '3306';
$db_user = 'root';
$db_pass = 'root';

$db_link = mysql_connect($db_host.':'.$db_port, $db_user, $db_pass) or die('数据库连接失败');
$result = mysql_query("SHOW DATABASES");
$databases = array();
while ($row = mysql_fetch_assoc($result))
{
	if(! in_array($row['Database'], array('information_schema', 'mysql')))
	{
		$databases[] = $row['Database'];
	}
}
if(empty($databases))
{
	die('服务器上没有数据库');
}
if(isset($_GET['db']) && in_array($_GET['db'], $databases))
{
	$check_table = $_GET['db'];
}
else
{
	$check_table = $databases[0];
}

$tables = array();
$sql = "SHOW TABLE STATUS FROM `{$check_table}`";
$result = mysql_query($sql);
while ($row = mysql_fetch_assoc($result))
{
	$tables[] = $row;
}
mysql_close($db_link);
?>
<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>MySQL 数据库备份工具</title>
<meta name="Keywords" content="" />
<meta name="Description" content="" />
<style type="text/css">
html,body,div,p,span,img,a,h1,h2,h3,h4,h6,h5,ul,li{padding:0;margin:0;}
.wrap{text-align:center;padding:10px;color:#333;}
#main{border:1px solid #999;height:auto;margin:0 auto;width:90%;}
h1{font-size:20px;padding:10px;font-weight:bold;}
#step_one{text-align:left;padding:10px;min-height:300px;}
.clear{clear:both;}
ul,li{list-style:none;}
.tables_ul{list-style:none;}
.tables_ul li{display:block;float:left; padding:2px;border:1px solid #EEE;margin:2px;}
.tables_ul li.xz{border:1px solid red;background:#EEE;}
.dump_option li{display:block;float:left; padding:2px;border:1px solid #999;margin:2px;}
#file_size{width:20px;}
#step_two{margin-top:20px;background:#efefef;text-align:left;min-height:300px;border-top:1px solid #999;padding:10px;display:block;overflow:hidden;}
#show_back_shell{margin:10px;border:1px solid #D6E9C6; background:#DFF0D8;padding:8px 14px;border-radius:5px;display:block;}
#show_import_shell{margin:10px;border:1px solid #D6E9C6; background:#DFF0D8;padding:8px 14px;border-radius:5px;display:block;}
a{text-decoration:none;}
#nav{position:fixed;left:1500px;top:50px;}
#nav a{font-weight:bold;}
</style>
</head>
<body>
<div class="wrap">
	<div id="main">
		<h1>数据库备份工具</h1>
		<hr />
		<div id="step_one">
			<a name="step_one"></a>
			<div id="">
			选择数据库：
			<select name="" id="select_db">
				<option>选择数据库</option>
				<?php foreach($databases as $key=>$db){
					if($db == $check_table){
						echo '<option value="',$db.'" selected>'.$db.'</option>';
					}else{
						echo '<option value="',$db.'">'.$db.'</option>';
					}
				?>
				
				<?php } ?>
			</select>
			<a href="javascript:xuanze(1);" >全选</a>
			<a href="javascript:xuanze(0);" >反选</a>
			赛选:
			文件大于<input type="text" id="file_size">
			<select id="file_dw">
				<option value="KB">KB</option>
				<option value="M">M</option>
				<option value="G">G</option>
			</select>
			<a href="javascript:saixuan(1);" id="saixuan_size">选中</a>

			</div>
			<div id="select_table">
				<ul class="tables_ul">
				<?php 
					foreach($tables as $key=>$table){ 
					$size = intval($table['Data_length']) + intval($table['Index_length']);
					$size_kb = round($size/1024, 2);
					if($size_kb>1024)
					{
						$size_mb = $size_kb/1024;
						if($size_mb>1024)
						{
							$table_size = $size_mb/1024;
							$table_dw = 'G';
						}
						else
						{
							$table_size = $size_mb;
							$table_dw = 'M';
						}
					}
					else
					{
						$table_size = $size_kb;
						$table_dw = 'KB';
					}
					$table_size = round($table_size, 2);
				?>
				 <li>
					<input type="checkbox" data="<?php echo($size_kb); ?>" data-dw="<?php echo($table_dw); ?>" id="<?php echo($table['Name']); ?>" value="<?php echo($table['Name']); ?>" class="cb">
					<label for="<?php echo($table['Name']); ?>">
					<?php 
						echo $table['Name'],'(<em>',$table['Rows'].'</em> 行)'; 
						echo '<span>', $table_size. $table_dw,'</span>'
					?>
					</label>
				</li>
				<?php } ?>
				</ul>
				<br class="clear"/>
			</div>
		</div>
		<div id="step_two">
			<a name="step_two"></a>
			<h2>备份选项:</h2>
			<ul class="dump_option">
			<li>
				<input type="checkbox" name="mysqldump_option" value="-d" id="no-data">
				<label for="no-data">仅结构</label>
			</li>
			<li>
				<input type="checkbox" name="mysqldump_option" value="--opt" id="opt">
				<label for="opt">快速导出</label>
			</li>
			<li>
				<input type="checkbox" name="mysqldump_option" value="--add-drop-database" id="add-drop-database">
				<label for="add-drop-database">添加drop数据库</label>
			</li>
			<li>
				<input type="checkbox" name="mysqldump_option" value="--add-drop-table" id="add-drop-table">
				<label for="add-drop-table">添加drop数据表</label>
			</li>
			<li>
				<input type="checkbox" name="mysqldump_option" value="--lock-all-tables" id="lock-all-tables">
				<label for="lock-all-tables">锁定数据库</label>
			</li>
			<li>
				<input type="checkbox" name="mysqldump_option" value="--routines" id="routines">
				<label for="routines">导出存储过程</label>
			</li>
			<li>
				<input type="checkbox" name="mysqldump_option" value="--triggers" id="triggers">
				<label for="triggers">导出触发器</label>
			</li>
			<li>
				<input type="checkbox" name="mysqldump_option" value="--default-character-set=utf8" id="default-character-set">
				<label for="default-character-set">指定字符集(UTF8)</label>
			</li>

			<li>
				<input type="checkbox" name="" id="gzip">
				<label for="gzip">gzip压缩</label>
			</li>
			<li><a href="javascript:show_back_shell();" >生成备份脚本</a></li>
			</ul>
			<br class="clear"/>
			<div id="show_back_shell"></div>
			<h2>还原数据库:</h2>
			<div id="show_import_shell">
				<p id="show_import_shell_a">mysql -uroot -p db_name < db_name.sql</p>
				<p id="show_import_shell_b">mysql -uroot -p db_name < db_name.sql</p>
			</div>
		</div>
	</div>
</div>
<div id="nav">
	<a href="#step_one">&uarr;</a><br/>
	<a href="#step_two">&darr;</a><br/>
</div>
<script type="text/javascript">
function xuanze(fw){
	var op = document.getElementsByClassName('cb');
	for(var i=0; i<op.length; i++)
	{
		//console.log(i)
		if(1 == fw){
			op[i].checked =true;
		}else{
			op[i].checked = !op[i].checked;
		}
	}
}
function saixuan(type){
	var file_size = document.getElementById('file_size').value;
	var file_dw = document.getElementById('file_dw').value;
	var op = document.getElementsByClassName('cb');
	var xuanzhong = 0;
	if(file_dw=='M'){
		file_size = parseFloat(file_size)*1024;
		console.log(file_size + 'M');
	}else if(file_dw=='G'){
		file_size = parseFloat(file_size)*1024*1024;
		console.log(file_size + 'G');
	}
	for(var i=0; i<op.length; i++)
	{
		var dw = op[i].getAttribute('data-dw');
		var size = op[i].getAttribute('data');
		if(parseFloat(size)>=parseFloat(file_size)){
			xuanzhong++;
			if(type==1){
				op[i].checked =true;
				op[i].parentElement.className="xz";
			}else{
				op[i].parentElement.className="xz";
			}
		}else{
			op[i].parentElement.className="";
			//console.log(size);
		}
	}
	document.getElementById('saixuan_size').innerHTML='选中('+xuanzhong+')项';
	//console.log(xuanzhong);
}
function getdate(day){
	if (day>=10){
		return day;
	}else{
		return "0" + day + "";
	}
}
function show_back_shell(){
	var shell = "mysqldump -h localhost -uroot -p*** ";
	var mysqldump_options =  document.getElementsByName('mysqldump_option');
	for(var i=0; i<mysqldump_options.length; i++)
	{
		if(mysqldump_options[i].checked)
		{
			shell += ' ' + mysqldump_options[i].value;
		}
	}
	var database = document.getElementById('select_db').value;
	shell += ' '+ database;
	var backtable = '';
	var op = document.getElementsByClassName('cb');
	var backdatabase = true;
	for(var i=0; i<op.length; i++)
	{
		if(op[i].checked)
		{
			backtable += ' ' + op[i].value;
		}
		else
		{
			backdatabase = false;
		}
	}
	if(false == backdatabase)
	{
		shell += ' '+ backtable;
	}
	var date = new Date();
	var back_file  = database;
	back_file += '_'+date.getFullYear() + getdate(date.getMonth()) +  getdate(date.getDate());
	back_file += getdate(date.getHours()) + getdate(date.getMinutes())+ getdate(date.getSeconds());
	
	//gzip
	var gzip = document.getElementById('gzip').checked;
	if(gzip){
		shell += ' | gzip > '+ back_file + '.sql.gz';
	}else{
		shell += ' > '+ back_file + '.sql';
	}
	document.getElementById('show_back_shell').innerHTML=shell;
	show_import_shell(back_file)
}
//显示导入脚本
function show_import_shell(back_file){
	var database = document.getElementById('select_db').value;
	//gzip
	var gzip = document.getElementById('gzip').checked;

	//方案-A
	var shell = "mysql -h localhost -uroot -p ";
	shell += ' '+ database;
	if(gzip){
		shell = 'gzip < '+ back_file + '.sql.gz | ' + shell;
	}else{
		shell += ' < '+ back_file + '.sql';
	}
	document.getElementById('show_import_shell_a').innerHTML=shell;

	//方案-B
	var shell = 'mysql -h localhost -uroot -p --database ';
	shell += ' '+ database;
	shell += ' -e "source ';
	if(gzip){
		var unzip = 'gzip -d '+ back_file + '.sql.gz > /tmp/'+back_file+'.sql';
		shell = unzip + ' ; ' + shell + ' /tmp/'+back_file+'.sql';
	}else{
		shell += ' '+ back_file + '.sql';
	}
	shell += '"';
	document.getElementById('show_import_shell_b').innerHTML=shell;
}

function shownav(){
	var nav = document.getElementById('nav');
	var main = document.getElementById('main')
	var left = main.offsetWidth + main.offsetLeft
	nav.style.left = left + "px";
}

function getQueryString(name) {
	var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
	var r = window.location.search.substr(1).match(reg);
	if (r != null) return unescape(r[2]); return null;
}
show_back_shell();
document.getElementById('file_size').onchange = saixuan;
document.getElementById('file_dw').onchange = saixuan;
shownav();
window.onresize = function(){shownav();}
document.getElementById('select_db').onchange = function(){
	var url = window.location.href;
	if(''==window.location.search){
		window.location.href = url+'?db='+this.value;
	}else{
		var db = getQueryString('db');
		window.location.href = url.replace(db,this.value);
	}
}
</script>
</body>
</html>
