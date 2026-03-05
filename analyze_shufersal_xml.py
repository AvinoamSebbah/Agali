"""Analyze Shufersal Stores XML structure"""
from lxml import etree

# Parse the file
tree = etree.parse('dumps/Shufersal/Stores7290027600007-000-202601070201.xml')
root = tree.getroot()

print(f'\n[*] Root tag: {root.tag}')
print(f'[*] Namespace: {root.nsmap}')
print(f'[*] Children: {[child.tag for child in root]}')

# Find values node
values = root.find('.//{http://www.sap.com/abapxml}values')
if values is not None:
    print(f'\n[*] Values children: {[child.tag for child in values][:10]}')
    
    # Check for ChainId
    chain_id_elem = values.find('.//CHAINID')
    if chain_id_elem is not None:
        print(f'[*] ChainId found: {chain_id_elem.text}')
    
    # Check for STORES
    stores_elem = values.find('.//STORES')
    if stores_elem is not None:
        print(f'[*] STORES element found')
        store_children = list(stores_elem)
        print(f'[*] Number of STOREs: {len(store_children)}')
        if store_children:
            print(f'[*] First store structure: {etree.tostring(store_children[0], encoding="unicode")[:500]}')
else:
    print('[!] No values element found')
