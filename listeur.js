var data = null;
var dataState = 'empty';
var currentList = null;
var accessHash = null;

////////////////////////////////////////////////////////////////////////////////
// login

function act_login() {
	var oPsw = document.getElementById('login_psw');
	accessHash = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(oPsw.value)).substring(0, 10);
	srv_retrieveData(login_fail);
}

function act_loginFromLocal() {
	if (local_isSet()) {
		local_retrieve();
		srv_retrieveData(null);
	}
}

function login_fail() {
	alert('login failed');
}

function login_success() {
	local_synchronize();
	gui_listOflists();
	changeLocation('#lstlst');
}

////////////////////////////////////////////////////////////////////////////////
// showList

function act_showList(listNum) {
	currentList = listNum;
	gui_list(data['lists'][listNum]);
	changeLocation('#lst_' + listNum);
}

////////////////////////////////////////////////////////////////////////////////
// Lists manipulation

function act_uplst(listNum) {
	event.stopPropagation();
	if (listNum <= 0) {
		return;
	}
	var swap = data['lists'][listNum-1];
	data['lists'][listNum-1] = data['lists'][listNum];
	data['lists'][listNum] = swap;
	srv_updateState('modified');
	gui_listOflists();
}

function act_downlst(listNum) {
	event.stopPropagation();
	if (listNum >= data['lists'].length - 1) {
		return;
	}
	var swap = data['lists'][listNum+1];
	data['lists'][listNum+1] = data['lists'][listNum];
	data['lists'][listNum] = swap;
	srv_updateState('modified');
	gui_listOflists();
}

function act_dellst(listNum) {
	event.stopPropagation();
	data['lists'].splice(listNum, 1);
	srv_updateState('modified');
	gui_listOflists();
}

function act_addlst() {
	gui_addlst();
}

function act_finalizeAddLst() {
	var name = document.getElementById('addlst_name').value;
	if (!listExists(name)) {
		data['lists'].splice(0, 0, {
			'name': name,
			'content': [
				{
					'category': null,
					'items': []
				}
			]
		});
		srv_updateState('modified');
	}

	gui_listOflists();
}

////////////////////////////////////////////////////////////////////////////////
// Current list manipulation

function act_upcat(catNum) {
	if (catNum <= 0) {
		return;
	}
	var swap = data['lists'][currentList]['content'][catNum-1];
	data['lists'][currentList]['content'][catNum-1] = data['lists'][currentList]['content'][catNum];
	data['lists'][currentList]['content'][catNum] = swap;
	srv_updateState('modified');

	gui_list(data['lists'][currentList]);
}

function act_downcat(catNum) {
	if (catNum >= data['lists'][currentList]['content'].length - 1) {
		return;
	}
	var swap = data['lists'][currentList]['content'][catNum+1];
	data['lists'][currentList]['content'][catNum+1] = data['lists'][currentList]['content'][catNum];
	data['lists'][currentList]['content'][catNum] = swap;
	srv_updateState('modified');

	gui_list(data['lists'][currentList]);
}

function act_delcat(catNum) {
	event.stopPropagation();
	data['lists'][currentList]['content'].splice(catNum, 1);
	srv_updateState('modified');
	gui_list(data['lists'][currentList]);
}

function act_addcat() {
	gui_addcat();
}

function act_finalizeAddCat() {
	var name = document.getElementById('addcat_name').value;
	if (!categoryExists(name, data['lists'][currentList])) {
		data['lists'][currentList]['content'].splice(0, 0, {
			"category": name,
			"items": []
		});
		srv_updateState('modified');
	}

	gui_list(data['lists'][currentList]);
}

function act_additem(catNum) {
	gui_additem(catNum);
}

function act_finalizeAddItem() {
	var catNum = parseInt(document.getElementById('additem_cat').value);
	var name = document.getElementById('additem_name').value;
	var cat = data['lists'][currentList]['content'][catNum];
	if (!itemExists(name, cat)) {
		cat['items'].splice(cat['items'].length, 0, name);
		srv_updateState('modified');
	}

	gui_list(data['lists'][currentList]);
}

function act_upitem(catNum, itemNum) {
	if (itemNum <= 0) {
		return;
	}
	var items = data['lists'][currentList]['content'][catNum]['items'];
	var swap = items[itemNum-1];
	items[itemNum-1] = items[itemNum];
	items[itemNum] = swap;
	srv_updateState('modified');
	gui_list(data['lists'][currentList]);
}

function act_downitem(catNum, itemNum) {
	var items = data['lists'][currentList]['content'][catNum]['items'];
	if (itemNum >= items.length - 1) {
		return;
	}
	var swap = items[itemNum+1];
	items[itemNum+1] = items[itemNum];
	items[itemNum] = swap;
	srv_updateState('modified');
	gui_list(data['lists'][currentList]);
}

function act_delitem(catNum, itemNum) {
	data['lists'][currentList]['content'][catNum]['items'].splice(itemNum, 1);
	srv_updateState('modified');
	gui_list(data['lists'][currentList]);
}

////////////////////////////////////////////////////////////////////////////////
// Local storage

function local_synchronize() {
	localStorage.setItem('accessHash', accessHash);
}

function local_isSet() {
	return localStorage.getItem('accessHash') !== null;
}

function local_retrieve() {
	accessHash = localStorage.getItem('accessHash');
}

////////////////////////////////////////////////////////////////////////////////
// Server

function srv_updateState(newState) {
	dataState = newState;
	gui_dataState();
}

function srv_synchronize() {
	var sFilename = '/listeur-data/send.php?f=' + accessHash;
	var sData = JSON.stringify(data);

	var xhr = new XMLHttpRequest();
	xhr.open("POST", sFilename, true);
	xhr.onload = function (e) {
		if (xhr.readyState === 4) {
			if (xhr.status >= 200 && xhr.status < 300) {
				srv_syncSuccess();
			}else {
				srv_syncFail();
			}
		}
	}
	xhr.onerror = function (e) {
		login_fail();
	}
	xhr.send(sData);
}

function srv_syncSuccess() {
	srv_updateState('sync');
}

function srv_syncFail() {
}

function srv_retrieveData(failCb) {
	var sFilename = '/listeur-data/' + accessHash + '.json?t=' + new Date().getTime();

	var xhr = new XMLHttpRequest();
	xhr.open("GET", sFilename, true);
	xhr.onload = function (e) {
		if (xhr.readyState === 4) {
			if (xhr.status >= 200 && xhr.status < 300) {
				srv_retrieveDataSuccess(JSON.parse(xhr.responseText));
			}else {
				if (failCb != null) {
					failCb();
				}
			}
		}
	}
	xhr.onerror = function (e) {
		if (failCb != null) {
			failCb();
		}
	}
	xhr.send(null);
}

function srv_retrieveDataSuccess(retrieved) {
	data = retrieved;
	srv_updateState('sync');
	login_success();
}

////////////////////////////////////////////////////////////////////////////////
// GUI

function gui_hideAll() {
	var forms = [
		document.getElementById('login'),
		document.getElementById('lstlst'),
		document.getElementById('lst'),
		document.getElementById('addlst'),
		document.getElementById('addcat'),
		document.getElementById('additem'),
	];

	for (var i = 0; i < forms.length; ++i) {
		forms[i].style.display = 'none';
	}
}

function gui_setPageName(name) {
	document.getElementById('pagename').innerHTML = name;
}

function gui_login() {
	gui_hideAll();
	gui_setPageName("Listeur");
	document.getElementById('login').style.display = 'block';
}

function gui_listOflists() {
	var lst = '';
	for (var i = 0; i < data['lists'].length; ++i) {
		lst +=
			'<li onclick="act_showList(' + i + ');">' +
				data['lists'][i]['name'] +
				'<ul class="actionbox">' +
					'<li class="up" onclick="act_uplst('+ i +')"></li>' +
					'<li class="down" onclick="act_downlst('+ i +')"></li>' +
					'<li class="del" onclick="act_dellst('+ i +')"></li>' +
				'</ul>' +
			'</li>'
		;
	}

	gui_hideAll();
	gui_setPageName("Listes");
	document.getElementById('lstlst_lst').innerHTML = lst;
	document.getElementById('lstlst').style.display = 'block';
}

function gui_list(list) {
	var lst = '';
	for (var i = 0; i < list['content'].length; ++i) {
		var category = list['content'][i];
		var catName = getCategoryName(category);
		lst +=
			'<li>' + catName + '<ul class="actionbox">' +
				'<li class="add" onclick="act_additem('+ i +')"></li>' +
				'<li class="up" onclick="act_upcat('+ i +')"></li>' +
				'<li class="down" onclick="act_downcat('+ i +')"></li>' +
				'<li class="del" onclick="act_delcat('+ i +')"></li>' +
			'</ul>'
		;
		lst += '<ul>';
		for (var j = 0; j < category['items'].length; ++j) {
			lst +=
				'<li>' + category['items'][j] + '<ul class="actionbox">' +
					'<li class="up" onclick="act_upitem('+ i +','+ j +')"></li>' +
					'<li class="down" onclick="act_downitem('+ i +','+ j +')"></li>' +
					'<li class="del" onclick="act_delitem('+ i +','+ j +')"></li>' +
				'</ul></li>'
			;
		}
		lst += '</ul></li>';
	}

	gui_hideAll();
	gui_setPageName(list['name']);
	document.getElementById('lst_lst').innerHTML = lst;
	document.getElementById('lst').style.display = 'block';
}

function gui_addlst() {
	gui_hideAll();
	gui_setPageName("Ajouter une liste");
	document.getElementById('addlst_name').value = '';
	document.getElementById('addlst').style.display = 'block';
}

function gui_addcat() {
	gui_hideAll();
	gui_setPageName("Ajouter une catégorie");
	document.getElementById('addcat_name').value = '';
	document.getElementById('addcat').style.display = 'block';
}

function gui_additem(catNum) {
	gui_hideAll();
	gui_setPageName("Ajouter une entrée");
	document.getElementById('additem_cat').value = catNum;
	document.getElementById('additem_name').value = '';
	document.getElementById('additem').style.display = 'block';
}

function gui_dataState() {
	var s = dataState;
	if (dataState == 'empty') {
		s = 'vide';
	}else if (dataState == 'sync') {
		s = 'synchronisé';
	}else if (dataState == 'modified') {
		s = 'modifié';
	}
	document.getElementById('status').innerHTML = 'Status: ' + s;
}


////////////////////////////////////////////////////////////////////////////////
// misc

function getCategoryName(category) {
	var catName = category['category'];
	if (catName === null) {
		catName = 'Autres';
	}
	return catName;
}

function listExists(name) {
	for (var i = 0; i < data['lists'].length; ++i) {
		if (data['lists'][i]['name'].toUpperCase() == name.toUpperCase()) {
			return true;
		}
	}
	return false;
}

function categoryExists(name, list) {
	for (var i = 0; i < list['content'].length; ++i) {
		var catName = list['content'][i]['category'];
		if (catName !== null && catName.toUpperCase() == name.toUpperCase()) {
			return true;
		}
	}
	return false;
}

function itemExists(name, cat) {
	for (var i = 0; i < cat['items'].length; ++i) {
		if (cat['items'][i].toUpperCase() == name.toUpperCase()) {
			return true;
		}
	}
	return false;
}

window.location.hash = '';
var locationHash = window.location.hash;
setInterval(function(){
	if (window.location.hash != locationHash) {
		locationHash = window.location.hash;
		goToHash(locationHash);
	}
	if(dataState != 'empty' && dataState != 'sync') {
		srv_synchronize();
	}
}, 1000);

function changeLocation(hash) {
	window.location.hash = hash;
	locationHash = hash;
}

function goToHash(hash) {
	if (hash == '#lstlst') {
		gui_listOflists();
	}else if (hash == '') {
		gui_login();
	}else if (hash == '#addlst') {
		gui_addlst();
	}else if (hash == '#addcat') {
		gui_addcat();
	}else if (hash.substring(0, 5) == '#lst_') {
		var i = parseInt(hash.substring(5));
		gui_list(data['lists'][i]);
	}
}
