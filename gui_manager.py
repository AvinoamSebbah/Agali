import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import subprocess
import threading
import asyncio
from pathlib import Path
import time
import os
import sys
import shutil
from il_supermarket_scarper.scrappers_factory import ScraperFactory
from il_supermarket_scarper.utils.file_types import FileTypesFilters

class AgaliManagerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Agali Scrapper Manager")
        self.root.state('zoomed')  # Plein écran sur Windows
        self.root.configure(bg="#1e1e1e")
        
        # Style
        self.setup_styles()
        
        # Variables
        self.scraping_process = None
        self.import_process = None
        self.scraping_thread = None
        self.import_thread = None
        self.stop_scraping_flag = False
        self.stop_import_flag = False
        
        # Create main container
        main_container = tk.Frame(root, bg="#1e1e1e")
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # Create header
        self.create_header(main_container)
        
        # Create notebook (tabs)
        self.notebook = ttk.Notebook(main_container)
        self.notebook.pack(fill=tk.BOTH, expand=False, padx=10, pady=(0, 5))
        
        # Create tabs
        self.create_quick_actions_tab()
        self.create_database_tab()
        self.create_scraping_tab()
        self.create_import_tab()
        
        # Create log section (shared across all tabs)
        self.create_log_section(main_container)
        
    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configure colors
        bg_dark = "#1e1e1e"
        bg_medium = "#2d2d30"
        bg_light = "#3e3e42"
        accent = "#007acc"
        success = "#4ec9b0"
        warning = "#ce9178"
        
        style.configure("Header.TLabel", 
                       background=bg_dark, 
                       foreground=accent, 
                       font=("Segoe UI", 16, "bold"))
        
        style.configure("Section.TLabel", 
                       background=bg_dark, 
                       foreground="#ffffff", 
                       font=("Segoe UI", 11, "bold"))
        
        style.configure("Info.TLabel", 
                       background=bg_medium, 
                       foreground="#cccccc", 
                       font=("Segoe UI", 9))
        
        # Notebook style
        style.configure("TNotebook", background=bg_dark, borderwidth=0)
        style.configure("TNotebook.Tab", 
                       background=bg_medium, 
                       foreground="#cccccc",
                       padding=[20, 10],
                       font=("Segoe UI", 10, "bold"))
        style.map("TNotebook.Tab",
                 background=[("selected", accent)],
                 foreground=[("selected", "#ffffff")])
        
        style.configure("Action.TButton",
                       background=accent,
                       foreground="#ffffff",
                       font=("Segoe UI", 10),
                       borderwidth=0,
                       focuscolor="none")
        
        style.map("Action.TButton",
                 background=[("active", "#005a9e")])
        
        style.configure("Success.TButton",
                       background=success,
                       foreground="#000000",
                       font=("Segoe UI", 10, "bold"))
        
        style.configure("Custom.Horizontal.TProgressbar",
                       troughcolor=bg_light,
                       background=accent,
                       bordercolor=bg_dark,
                       lightcolor=accent,
                       darkcolor=accent)
        
    def create_header(self, parent):
        header_frame = tk.Frame(parent, bg="#1e1e1e", pady=10)
        header_frame.pack(fill=tk.X)
        
        title = ttk.Label(header_frame, 
                         text="🛒 Agali Scrapper Manager", 
                         style="Header.TLabel")
        title.pack()
        
        subtitle = ttk.Label(header_frame,
                           text="Gestion centralisée du scraping et import de données",
                           style="Info.TLabel")
        subtitle.pack()
    
    def create_quick_actions_tab(self):
        tab = tk.Frame(self.notebook, bg="#2d2d30")
        self.notebook.add(tab, text="⚡ Actions Rapides")
        
        # Container with padding
        container = tk.Frame(tab, bg="#2d2d30", padx=30, pady=20)
        container.pack(fill=tk.BOTH, expand=True)
        
        label = ttk.Label(container, text="Outils d'administration", style="Section.TLabel")
        label.pack(anchor=tk.W, pady=(0, 20))
        
        # Create grid for buttons
        button_frame = tk.Frame(container, bg="#2d2d30")
        button_frame.pack(fill=tk.BOTH, expand=True)
        
        # Row 1: Prisma & pgAdmin
        prisma_btn = tk.Button(button_frame,
                              text="🔷 Ouvrir Prisma Studio\n\nInterface graphique pour gérer\nla base de données",
                              command=self.open_prisma,
                              bg="#007acc",
                              fg="white",
                              font=("Segoe UI", 11, "bold"),
                              relief=tk.FLAT,
                              padx=30,
                              pady=30,
                              cursor="hand2",
                              width=30,
                              height=5)
        prisma_btn.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        
        pgadmin_btn = tk.Button(button_frame,
                               text="🗄️ Ouvrir pgAdmin\n\nOutil d'administration\nPostgreSQL complet",
                               command=self.open_pgadmin,
                               bg="#4ec9b0",
                               fg="black",
                               font=("Segoe UI", 11, "bold"),
                               relief=tk.FLAT,
                               padx=30,
                               pady=30,
                               cursor="hand2",
                               width=30,
                               height=5)
        pgadmin_btn.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        # Row 2: Stats & Clear
        stats_btn = tk.Button(button_frame,
                             text="📊 Statistiques Tables\n\nAfficher le nombre d'enregistrements\npar table",
                             command=self.show_table_stats,
                             bg="#569cd6",
                             fg="white",
                             font=("Segoe UI", 11, "bold"),
                             relief=tk.FLAT,
                             padx=30,
                             pady=30,
                             cursor="hand2",
                             width=30,
                             height=5)
        stats_btn.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")
        
        clear_db_btn = tk.Button(button_frame,
                                text="🗑️ Vider Base de Données\n\nSupprimer toutes les données\ndes tables",
                                command=self.clear_database,
                                bg="#f48771",
                                fg="black",
                                font=("Segoe UI", 11, "bold"),
                                relief=tk.FLAT,
                                padx=30,
                                pady=30,
                                cursor="hand2",
                                width=30,
                                height=5)
        clear_db_btn.grid(row=1, column=1, padx=10, pady=10, sticky="nsew")
        
        # Configure grid weights for responsive layout
        button_frame.grid_columnconfigure(0, weight=1)
        button_frame.grid_columnconfigure(1, weight=1)
        button_frame.grid_rowconfigure(0, weight=1)
        button_frame.grid_rowconfigure(1, weight=1)
    
    def create_database_tab(self):
        tab = tk.Frame(self.notebook, bg="#2d2d30")
        self.notebook.add(tab, text="🗃️ Gestion Base de Données")
        
        # Container with padding
        container = tk.Frame(tab, bg="#2d2d30", padx=30, pady=20)
        container.pack(fill=tk.BOTH, expand=True)
        
        label = ttk.Label(container, text="Maintenance et nettoyage", style="Section.TLabel")
        label.pack(anchor=tk.W, pady=(0, 20))
        
        # Create grid for buttons
        button_frame = tk.Frame(container, bg="#2d2d30")
        button_frame.pack(fill=tk.BOTH, expand=True)
        
        # Row 1
        clear_dumps_btn = tk.Button(button_frame,
                                   text="📁 Vider Dossier Dumps\n\nSupprimer tous les fichiers XML\ntéléchargés",
                                   command=self.clear_dumps,
                                   bg="#ce9178",
                                   fg="black",
                                   font=("Segoe UI", 11, "bold"),
                                   relief=tk.FLAT,
                                   padx=30,
                                   pady=30,
                                   cursor="hand2",
                                   width=30,
                                   height=5)
        clear_dumps_btn.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        
        clean_processed_btn = tk.Button(button_frame,
                                       text="🧹 Nettoyer Dumps Traités\n\nSupprimer uniquement les fichiers\ndéjà importés en base",
                                       command=self.clean_processed_dumps,
                                       bg="#d7ba7d",
                                       fg="black",
                                       font=("Segoe UI", 11, "bold"),
                                       relief=tk.FLAT,
                                       padx=30,
                                       pady=30,
                                       cursor="hand2",
                                       width=30,
                                       height=5)
        clean_processed_btn.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        # Row 2
        clear_json_btn = tk.Button(button_frame,
                                  text="🔄 Reset Cache Scraper\n\nRéinitialiser l'historique\nde téléchargement",
                                  command=self.clear_json_cache,
                                  bg="#569cd6",
                                  fg="white",
                                  font=("Segoe UI", 11, "bold"),
                                  relief=tk.FLAT,
                                  padx=30,
                                  pady=30,
                                  cursor="hand2",
                                  width=30,
                                  height=5)
        clear_json_btn.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")
        
        # Search products button
        search_products_btn = tk.Button(button_frame,
                                       text="🔍 Recherche Produits\n\nChercher un produit et voir\nses prix par magasin",
                                       command=self.open_product_search,
                                       bg="#4ec9b0",
                                       fg="black",
                                       font=("Segoe UI", 11, "bold"),
                                       relief=tk.FLAT,
                                       padx=30,
                                       pady=30,
                                       cursor="hand2",
                                       width=30,
                                       height=5)
        search_products_btn.grid(row=1, column=1, padx=10, pady=10, sticky="nsew")
        
        # Row 3 - Clean Database
        clean_db_btn = tk.Button(button_frame,
                                text="🧽 Nettoyer Base de Données\n\nSupprimer données obsolètes:\npromos expirées, prix dupliqués...",
                                command=self.clean_database_data,
                                bg="#c586c0",
                                fg="white",
                                font=("Segoe UI", 11, "bold"),
                                relief=tk.FLAT,
                                padx=30,
                                pady=30,
                                cursor="hand2",
                                width=30,
                                height=5)
        clean_db_btn.grid(row=2, column=0, columnspan=2, padx=10, pady=10, sticky="nsew")
        
        # Configure grid weights
        button_frame.grid_columnconfigure(0, weight=1)
        button_frame.grid_columnconfigure(1, weight=1)
        button_frame.grid_rowconfigure(0, weight=1)
        button_frame.grid_rowconfigure(1, weight=1)
        button_frame.grid_rowconfigure(2, weight=1)
        
    def create_scraping_tab(self):
        tab = tk.Frame(self.notebook, bg="#2d2d30")
        self.notebook.add(tab, text="🌐 Scraping")
        
        # Container with padding
        container = tk.Frame(tab, bg="#2d2d30", padx=20, pady=15)
        container.pack(fill=tk.BOTH, expand=True)
        
        # Options frame
        options_frame = tk.Frame(container, bg="#3e3e42", padx=15, pady=10)
        options_frame.pack(fill=tk.BOTH, expand=True)
        
        # File types selection
        tk.Label(options_frame, 
                text="Types de fichiers:", 
                bg="#3e3e42", 
                fg="#ffffff",
                font=("Segoe UI", 9, "bold")).grid(row=0, column=0, sticky=tk.NW, pady=5)
        
        file_types_frame = tk.Frame(options_frame, bg="#3e3e42")
        file_types_frame.grid(row=0, column=1, sticky=tk.W, padx=(10, 0), pady=5)
        
        self.file_type_vars = {}
        file_types = FileTypesFilters.all_types()
        for i, ft in enumerate(file_types):
            var = tk.BooleanVar(value=True)
            self.file_type_vars[ft] = var
            cb = ttk.Checkbutton(file_types_frame, text=ft.replace('_', ' '), variable=var)
            cb.grid(row=i//3, column=i%3, sticky=tk.W, padx=5, pady=2)
        
        # Stores selection
        tk.Label(options_frame, 
                text="Magasins:", 
                bg="#3e3e42", 
                fg="#ffffff",
                font=("Segoe UI", 9, "bold")).grid(row=1, column=0, sticky=tk.NW, pady=5, padx=(0, 10))
        
        stores_frame = tk.Frame(options_frame, bg="#3e3e42")
        stores_frame.grid(row=1, column=1, sticky=tk.W, padx=(10, 0), pady=5)
        
        self.store_vars = {}
        stores = ScraperFactory.all_listed_scrappers()
        for i, store in enumerate(stores):
            var = tk.BooleanVar(value=False)
            self.store_vars[store] = var
            cb = ttk.Checkbutton(stores_frame, text=store, variable=var)
            cb.grid(row=i//5, column=i%5, sticky=tk.W, padx=5, pady=2)
        
        # Buttons for select all/none
        select_buttons_frame = tk.Frame(options_frame, bg="#3e3e42")
        select_buttons_frame.grid(row=2, column=1, sticky=tk.W, padx=(10, 0), pady=5)
        
        tk.Button(select_buttons_frame,
                 text="Tout sélectionner",
                 command=lambda: self.select_all_stores(True),
                 bg="#007acc",
                 fg="white",
                 font=("Segoe UI", 8),
                 relief=tk.FLAT,
                 padx=10,
                 pady=5,
                 cursor="hand2").pack(side=tk.LEFT, padx=(0, 5))
        
        tk.Button(select_buttons_frame,
                 text="Tout désélectionner",
                 command=lambda: self.select_all_stores(False),
                 bg="#f48771",
                 fg="black",
                 font=("Segoe UI", 8),
                 relief=tk.FLAT,
                 padx=10,
                 pady=5,
                 cursor="hand2").pack(side=tk.LEFT)
        
        # Limit
        tk.Label(options_frame,
                text="Limite de fichiers:",
                bg="#3e3e42",
                fg="#ffffff",
                font=("Segoe UI", 9)).grid(row=3, column=0, sticky=tk.W, pady=5)
        
        self.scraping_limit = tk.StringVar(value="")
        limit_entry = ttk.Entry(options_frame, textvariable=self.scraping_limit, width=20)
        limit_entry.grid(row=3, column=1, sticky=tk.W, padx=(10, 0), pady=5)
        
        # Buttons frame
        buttons_frame = tk.Frame(container, bg="#2d2d30")
        buttons_frame.pack(pady=10)
        
        # Start button
        self.start_scraping_btn = tk.Button(buttons_frame,
                            text="▶️ Démarrer le Scraping",
                            command=self.start_scraping,
                            bg="#ce9178",
                            fg="black",
                            font=("Segoe UI", 11, "bold"),
                            relief=tk.FLAT,
                            padx=30,
                            pady=12,
                            cursor="hand2")
        self.start_scraping_btn.pack(side=tk.LEFT, padx=5)
        
        # Stop button
        self.stop_scraping_btn = tk.Button(buttons_frame,
                            text="⏹️ Arrêter le Scraping",
                            command=self.stop_scraping,
                            bg="#f48771",
                            fg="black",
                            font=("Segoe UI", 11, "bold"),
                            relief=tk.FLAT,
                            padx=30,
                            pady=12,
                            cursor="hand2",
                            state=tk.DISABLED)
        self.stop_scraping_btn.pack(side=tk.LEFT, padx=5)
        
        # Progress
        self.scraping_progress_frame = tk.Frame(container, bg="#2d2d30")
        self.scraping_progress_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.scraping_progress_label = tk.Label(self.scraping_progress_frame,
                                               text="En attente...",
                                               bg="#2d2d30",
                                               fg="#cccccc",
                                               font=("Segoe UI", 9))
        self.scraping_progress_label.pack()
        
        self.scraping_progress_bar = ttk.Progressbar(self.scraping_progress_frame,
                                                    style="Custom.Horizontal.TProgressbar",
                                                    mode="determinate",
                                                    length=500)
        self.scraping_progress_bar.pack(pady=5)
        
    def create_import_tab(self):
        tab = tk.Frame(self.notebook, bg="#2d2d30")
        self.notebook.add(tab, text="📦 Import Base de Données")
        
        # Container with padding
        container = tk.Frame(tab, bg="#2d2d30", padx=20, pady=15)
        container.pack(fill=tk.BOTH, expand=True)
        
        # Options
        options_frame = tk.Frame(container, bg="#3e3e42", padx=15, pady=10)
        options_frame.pack(fill=tk.BOTH, expand=True)
        
        # Type selection
        tk.Label(options_frame,
                text="Types de fichiers:",
                bg="#3e3e42",
                fg="#ffffff",
                font=("Segoe UI", 9, "bold")).grid(row=0, column=0, sticky=tk.W, pady=5)
        
        type_frame = tk.Frame(options_frame, bg="#3e3e42")
        type_frame.grid(row=0, column=1, sticky=tk.W, padx=(10, 0), pady=5)
        
        self.import_stores = tk.BooleanVar(value=True)
        self.import_promo = tk.BooleanVar(value=True)
        self.import_price = tk.BooleanVar(value=True)
        
        ttk.Checkbutton(type_frame, text="Stores", variable=self.import_stores).pack(side=tk.LEFT, padx=5)
        ttk.Checkbutton(type_frame, text="Promo", variable=self.import_promo).pack(side=tk.LEFT, padx=5)
        ttk.Checkbutton(type_frame, text="Price", variable=self.import_price).pack(side=tk.LEFT, padx=5)
        
        # Stores selection
        tk.Label(options_frame, 
                text="Magasins:", 
                bg="#3e3e42", 
                fg="#ffffff",
                font=("Segoe UI", 9, "bold")).grid(row=1, column=0, sticky=tk.NW, pady=5, padx=(0, 10))
        
        import_stores_frame = tk.Frame(options_frame, bg="#3e3e42")
        import_stores_frame.grid(row=1, column=1, sticky=tk.W, padx=(10, 0), pady=5)
        
        self.import_store_vars = {}
        stores = ScraperFactory.all_listed_scrappers()
        for i, store in enumerate(stores):
            var = tk.BooleanVar(value=False)
            self.import_store_vars[store] = var
            cb = ttk.Checkbutton(import_stores_frame, text=store, variable=var)
            cb.grid(row=i//5, column=i%5, sticky=tk.W, padx=5, pady=2)
        
        # Buttons for select all/none
        import_select_buttons_frame = tk.Frame(options_frame, bg="#3e3e42")
        import_select_buttons_frame.grid(row=2, column=1, sticky=tk.W, padx=(10, 0), pady=5)
        
        tk.Button(import_select_buttons_frame,
                 text="Tout sélectionner",
                 command=lambda: self.select_all_import_stores(True),
                 bg="#007acc",
                 fg="white",
                 font=("Segoe UI", 8),
                 relief=tk.FLAT,
                 padx=10,
                 pady=5,
                 cursor="hand2").pack(side=tk.LEFT, padx=(0, 5))
        
        tk.Button(import_select_buttons_frame,
                 text="Tout désélectionner",
                 command=lambda: self.select_all_import_stores(False),
                 bg="#f48771",
                 fg="black",
                 font=("Segoe UI", 8),
                 relief=tk.FLAT,
                 padx=10,
                 pady=5,
                 cursor="hand2").pack(side=tk.LEFT)
        
        # Buttons frame
        import_buttons_frame = tk.Frame(container, bg="#2d2d30")
        import_buttons_frame.pack(pady=10)
        
        # Start button
        self.start_import_btn = tk.Button(import_buttons_frame,
                            text="▶️ Démarrer l'Import",
                            command=self.start_import,
                            bg="#007acc",
                            fg="white",
                            font=("Segoe UI", 11, "bold"),
                            relief=tk.FLAT,
                            padx=30,
                            pady=12,
                            cursor="hand2")
        self.start_import_btn.pack(side=tk.LEFT, padx=5)
        
        # Stop button
        self.stop_import_btn = tk.Button(import_buttons_frame,
                            text="⏹️ Arrêter l'Import",
                            command=self.stop_import,
                            bg="#f48771",
                            fg="black",
                            font=("Segoe UI", 11, "bold"),
                            relief=tk.FLAT,
                            padx=30,
                            pady=12,
                            cursor="hand2",
                            state=tk.DISABLED)
        self.stop_import_btn.pack(side=tk.LEFT, padx=5)
        
        # Progress
        self.import_progress_frame = tk.Frame(container, bg="#2d2d30")
        self.import_progress_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.import_progress_label = tk.Label(self.import_progress_frame,
                                             text="En attente...",
                                             bg="#2d2d30",
                                             fg="#cccccc",
                                             font=("Segoe UI", 9))
        self.import_progress_label.pack()
        
        self.import_progress_bar = ttk.Progressbar(self.import_progress_frame,
                                                  style="Custom.Horizontal.TProgressbar",
                                                  mode="determinate",
                                                  length=500)
        self.import_progress_bar.pack(pady=5)
        
        self.import_time_label = tk.Label(self.import_progress_frame,
                                         text="",
                                         bg="#2d2d30",
                                         fg="#4ec9b0",
                                         font=("Segoe UI", 9, "bold"))
        self.import_time_label.pack()
        
    def create_log_section(self, parent):
        frame = tk.Frame(parent, bg="#2d2d30", pady=5, padx=10)
        frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))
        
        label = ttk.Label(frame, text="📋 Logs", style="Section.TLabel")
        label.pack(anchor=tk.W, pady=(0, 5))
        
        self.log_text = scrolledtext.ScrolledText(frame,
                                                 height=20,
                                                 bg="#1e1e1e",
                                                 fg="#cccccc",
                                                 font=("Consolas", 9),
                                                 relief=tk.FLAT,
                                                 padx=10,
                                                 pady=10)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        self.log_line_count = 0  # Compteur de lignes pour rotation
        
    def log(self, message, color="#cccccc"):
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_line_count += 1
        
        # Rotation: garder seulement les 50 dernieres lignes (5 visibles + buffer)
        if self.log_line_count > 50:
            # Supprimer les 10 premieres lignes
            self.log_text.delete("1.0", "11.0")
            self.log_line_count -= 10
        
        self.log_text.see(tk.END)  # Auto-scroll vers le bas
        
    def open_prisma(self):
        self.log("🔷 Ouverture de Prisma Studio...", "#007acc")
        try:
            # Utiliser le Prisma du dossier web avec plus de mémoire
            web_path = Path(__file__).parent / 'web'
            env = os.environ.copy()
            env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
            env['NODE_OPTIONS'] = '--max-old-space-size=4096'  # 4GB de mémoire
            
            cmd = ['cmd', '/c', 'start', 'cmd', '/k', 
                   f'cd /d {web_path} && set NODE_OPTIONS=--max-old-space-size=4096 && npx prisma studio']
            subprocess.Popen(cmd, shell=True, env=env)
            self.log("✅ Prisma Studio démarré sur http://localhost:5555", "#4ec9b0")
            self.log("⚠️  Base volumineuse : utilisez pgAdmin si trop lent", "#f48771")
        except Exception as e:
            self.log(f"❌ Erreur: {e}", "#f48771")
            
    def open_pgadmin(self):
        self.log("🗄️ Ouverture de pgAdmin...", "#4ec9b0")
        try:
            subprocess.Popen('start http://localhost:5050', shell=True)
            self.log("✅ pgAdmin ouvert dans le navigateur", "#4ec9b0")
        except Exception as e:
            self.log(f"❌ Erreur: {e}", "#f48771")
    
    def select_all_stores(self, value):
        for var in self.store_vars.values():
            var.set(value)
        self.log(f"{'✅ Tous les magasins sélectionnés' if value else '❌ Tous les magasins désélectionnés'}")
    
    def select_all_import_stores(self, value):
        for var in self.import_store_vars.values():
            var.set(value)
        self.log(f"{'✅ Tous les magasins sélectionnés (Import)' if value else '❌ Tous les magasins désélectionnés (Import)'}")
    
    def show_table_stats(self):
        self.log("📊 Récupération des statistiques...", "#4ec9b0")
        
        def get_stats():
            try:
                result = subprocess.run(
                    "python check_db.py",
                    shell=True,
                    capture_output=True,
                    text=True,
                    cwd=os.path.dirname(__file__)
                )
                
                if result.returncode == 0:
                    stats = result.stdout
                    self.log(stats, "#4ec9b0")
                    messagebox.showinfo("Statistiques Base de Données", stats)
                else:
                    self.log(f"❌ Erreur: {result.stderr}", "#f48771")
                    
            except Exception as e:
                self.log(f"❌ Erreur: {e}", "#f48771")
                
        thread = threading.Thread(target=get_stats, daemon=True)
        thread.start()
    
    def clear_database(self):
        if not messagebox.askyesno("Confirmation", 
                                   "⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les données des tables ?\n\n"
                                   "Cette action est IRRÉVERSIBLE !"):
            return
            
        self.log("🗑️ Suppression des données des tables...", "#f48771")
        
        def clear_tables():
            try:
                result = subprocess.run(
                    "python clear_db.py",
                    shell=True,
                    capture_output=True,
                    text=True,
                    cwd=os.path.dirname(__file__)
                )
                
                if result.returncode == 0:
                    self.log("✅ Base de données vidée avec succès", "#4ec9b0")
                    messagebox.showinfo("Succès", "Toutes les tables ont été vidées")
                else:
                    self.log(f"❌ Erreur: {result.stderr}", "#f48771")
                    
            except Exception as e:
                self.log(f"❌ Erreur: {e}", "#f48771")
                
        thread = threading.Thread(target=clear_tables, daemon=True)
        thread.start()
    
    def clear_dumps(self):
        if not messagebox.askyesno("Confirmation",
                                   "⚠️ Êtes-vous sûr de vouloir supprimer tout le contenu du dossier dumps ?\n\n"
                                   "Cette action est IRRÉVERSIBLE !"):
            return
            
        self.log("📁 Suppression du contenu de dumps/...", "#ce9178")
        
        def clear_dumps_folder():
            try:
                dumps_path = Path("dumps")
                if dumps_path.exists():
                    for item in dumps_path.iterdir():
                        if item.is_dir():
                            shutil.rmtree(item)
                            self.log(f"  - Supprimé: {item.name}")
                        else:
                            item.unlink()
                            self.log(f"  - Supprimé: {item.name}")
                    
                    self.log("✅ Dossier dumps vidé avec succès", "#4ec9b0")
                    messagebox.showinfo("Succès", "Le dossier dumps a été vidé")
                else:
                    self.log("❌ Le dossier dumps n'existe pas", "#f48771")
                    
            except Exception as e:
                self.log(f"❌ Erreur: {e}", "#f48771")
                
        thread = threading.Thread(target=clear_dumps_folder, daemon=True)
        thread.start()
    
    def clear_json_cache(self):
        """Vider le cache JSON du scraper (verified_downloads)"""
        response = messagebox.askyesno(
            "Confirmer le reset",
            "Voulez-vous vider le cache du scraper?\n\n"
            "Cela permettra de re-télécharger tous les fichiers,\n"
            "même ceux déjà téléchargés selon l'ancien système.\n\n"
            "⚠️ Utile si vous avez vidé dumps/ manuellement."
        )
        
        if not response:
            return
        
        self.log("🔄 Vidage du cache JSON du scraper...", "#569cd6")
        
        def clear_json():
            try:
                result = subprocess.run(
                    ["python", "clear_json_db.py"],
                    capture_output=True,
                    text=True,
                    cwd=os.path.dirname(__file__)
                )
                
                for line in result.stdout.split('\n'):
                    if line.strip():
                        self.log(line.strip())
                
                if result.returncode == 0:
                    self.log("✅ Cache JSON vidé avec succès!", "#4ec9b0")
                    messagebox.showinfo("Succès", "Le cache du scraper a été réinitialisé")
                else:
                    self.log("❌ Erreur lors du vidage du cache", "#f48771")
                    
            except Exception as e:
                self.log(f"❌ Erreur: {e}", "#f48771")
                messagebox.showerror("Erreur", f"Erreur lors du reset: {e}")
        
        thread = threading.Thread(target=clear_json, daemon=True)
        thread.start()
    
    def clean_database_data(self):
        """Nettoyer la base de données (promos expirées, prix dupliqués, etc.)"""
        response = messagebox.askyesno(
            "Confirmer le nettoyage SÉCURISÉ",
            "🧽 Nettoyer la base de données (MODE SÉCURISÉ)?\n\n"
            "Cette opération va:\n"
            "  ✅ Vérifier les doublons de barcode (SANS supprimer)\n"
            "  ✅ Supprimer les promotions EXPIRÉES uniquement\n"
            "  ✅ Supprimer les anciens prix (garde le plus récent)\n"
            "  ❌ JAMAIS supprimer de produits !\n\n"
            "Tout séparé par magasin pour plus de sécurité.\n\n"
            "⚠️ Cette action est IRRÉVERSIBLE !\n"
            "Voulez-vous continuer?"
        )
        
        if not response:
            return
        
        self.log("🧽 Démarrage du nettoyage SÉCURISÉ de la base de données...", "#c586c0")
        
        def run_cleanup():
            try:
                # Lancer le script de nettoyage SÉCURISÉ
                result = subprocess.run(
                    ["python", "safe_database_cleanup.py", "--execute"],
                    capture_output=True,
                    text=True,
                    cwd=os.path.dirname(__file__),
                    input="oui\n"  # Répondre automatiquement "oui" à la confirmation
                )
                
                # Afficher la sortie
                for line in result.stdout.split('\n'):
                    if line.strip():
                        # Colorer les lignes selon leur contenu
                        if "✓" in line or "succès" in line.lower():
                            self.log(line.strip(), "#4ec9b0")
                        elif "✗" in line or "erreur" in line.lower():
                            self.log(line.strip(), "#f48771")
                        elif "=" in line:
                            self.log(line.strip(), "#c586c0")
                        else:
                            self.log(line.strip())
                
                if result.returncode == 0:
                    self.log("✅ Nettoyage de la base de données terminé avec succès!", "#4ec9b0")
                    messagebox.showinfo("Succès", "La base de données a été nettoyée avec succès!\n\nConsultez les logs pour voir les détails.")
                else:
                    self.log("❌ Le nettoyage a échoué", "#f48771")
                    messagebox.showerror("Erreur", "Le nettoyage de la base de données a échoué.\n\nConsultez les logs pour plus de détails.")
                    
            except Exception as e:
                self.log(f"❌ Erreur lors du nettoyage: {e}", "#f48771")
                messagebox.showerror("Erreur", f"Erreur lors du nettoyage: {e}")
        
        thread = threading.Thread(target=run_cleanup, daemon=True)
        thread.start()
    
    def clean_processed_dumps(self):
        """Supprimer les fichiers dumps déjà traités"""
        if not messagebox.askyesno("Confirmation",
                                   "🧹 Supprimer tous les fichiers dumps déjà traités en base?\n\n"
                                   "Cela permettra d'économiser de l'espace disque."):
            return
            
        self.log("🧹 Nettoyage des fichiers traités...", "#d7ba7d")
        
        def clean_processed():
            try:
                # Lancer le script clean_processed_dumps.py
                process = subprocess.Popen(['python', 'clean_processed_dumps.py'],
                                         stdout=subprocess.PIPE,
                                         stderr=subprocess.STDOUT,
                                         text=True,
                                         cwd=os.path.dirname(__file__))
                
                for line in process.stdout:
                    line = line.strip()
                    if line:
                        self.log(line)
                
                process.wait()
                
                if process.returncode == 0:
                    self.log("✅ Nettoyage terminé avec succès", "#4ec9b0")
                    messagebox.showinfo("Succès", "Les fichiers traités ont été supprimés")
                else:
                    self.log("❌ Erreur lors du nettoyage", "#f48771")
                    
            except Exception as e:
                self.log(f"❌ Erreur: {e}", "#f48771")
                messagebox.showerror("Erreur", f"Erreur lors du nettoyage: {e}")
        
        thread = threading.Thread(target=clean_processed, daemon=True)
        thread.start()
            
    def start_scraping(self):
        self.log("🌐 Démarrage du scraping...", "#ce9178")
        
        # Disable start, enable stop
        self.start_scraping_btn.config(state=tk.DISABLED)
        self.stop_scraping_btn.config(state=tk.NORMAL)
        self.stop_scraping_flag = False
        
        # Get selected stores
        selected_stores = [name for name, var in self.store_vars.items() if var.get()]
        if not selected_stores:
            messagebox.showwarning("Attention", "Sélectionnez au moins un magasin")
            self.start_scraping_btn.config(state=tk.NORMAL)
            self.stop_scraping_btn.config(state=tk.DISABLED)
            return
        
        # Get selected file types
        selected_types = [ft for ft, var in self.file_type_vars.items() if var.get()]
        if not selected_types:
            messagebox.showwarning("Attention", "Sélectionnez au moins un type de fichier")
            self.start_scraping_btn.config(state=tk.NORMAL)
            self.stop_scraping_btn.config(state=tk.DISABLED)
            return
        
        limit = self.scraping_limit.get().strip()
        
        # Build command using environment variables
        env_vars = os.environ.copy()
        
        if len(selected_stores) < len(self.store_vars):
            env_vars["ENABLED_SCRAPERS"] = ",".join(selected_stores)
        
        if len(selected_types) < len(self.file_type_vars):
            env_vars["ENABLED_FILE_TYPES"] = ",".join(selected_types)
        
        if limit:
            env_vars["LIMIT"] = limit
        
        cmd = "python main.py"
        
        self.log(f"📝 Commande: {cmd}", "#cccccc")
        if env_vars.get("ENABLED_SCRAPERS"):
            self.log(f"   Scrapers: {env_vars['ENABLED_SCRAPERS']}", "#cccccc")
        if env_vars.get("ENABLED_FILE_TYPES"):
            self.log(f"   File types: {env_vars['ENABLED_FILE_TYPES']}", "#cccccc")
        if env_vars.get("LIMIT"):
            self.log(f"   Limit: {env_vars['LIMIT']}", "#cccccc")
        
        def run_scraping():
            try:
                self.scraping_progress_label.config(text="🔄 Scraping en cours...")
                self.scraping_progress_bar["value"] = 50
                
                self.scraping_process = subprocess.Popen(cmd,
                                         shell=True,
                                         stdout=subprocess.PIPE,
                                         stderr=subprocess.STDOUT,
                                         text=True,
                                         env=env_vars,
                                         cwd=os.path.dirname(__file__))
                
                for line in self.scraping_process.stdout:
                    if self.stop_scraping_flag:
                        # Signal to all worker processes to stop
                        from il_supermarket_scarper.utils.stop_controller import StopController
                        StopController.request_stop()
                        self.scraping_process.terminate()
                        self.log("⏹️ Scraping arrêté par l'utilisateur", "#ce9178")
                        self.scraping_progress_label.config(text="⏹️ Scraping arrêté")
                        break
                    self.log(line.strip())
                    
                if not self.stop_scraping_flag:
                    self.scraping_process.wait()
                    
                    if self.scraping_process.returncode == 0:
                        self.scraping_progress_bar["value"] = 100
                        self.scraping_progress_label.config(text="✅ Scraping terminé avec succès!")
                        self.log("✅ Scraping terminé!", "#4ec9b0")
                    else:
                        self.scraping_progress_label.config(text="❌ Erreur lors du scraping")
                        self.log(f"❌ Erreur (code {self.scraping_process.returncode})", "#f48771")
                    
            except Exception as e:
                self.scraping_progress_label.config(text="❌ Erreur")
                self.log(f"❌ Erreur: {e}", "#f48771")
            finally:
                self.scraping_process = None
                self.start_scraping_btn.config(state=tk.NORMAL)
                self.stop_scraping_btn.config(state=tk.DISABLED)
                
        self.scraping_thread = threading.Thread(target=run_scraping, daemon=True)
        self.scraping_thread.start()
        
    def start_import(self):
        # Disable start, enable stop
        self.start_import_btn.config(state=tk.DISABLED)
        self.stop_import_btn.config(state=tk.NORMAL)
        self.stop_import_flag = False
        
        types = []
        if self.import_stores.get():
            types.append("stores")
        if self.import_promo.get():
            types.append("promo")
        if self.import_price.get():
            types.append("price")
            
        if not types:
            messagebox.showwarning("Attention", "Sélectionnez au moins un type de fichier à importer")
            self.start_import_btn.config(state=tk.NORMAL)
            self.stop_import_btn.config(state=tk.DISABLED)
            return
        
        # Get selected stores for import
        selected_stores = [name for name, var in self.import_store_vars.items() if var.get()]
        if not selected_stores:
            messagebox.showwarning("Attention", "Sélectionnez au moins un magasin")
            self.start_import_btn.config(state=tk.NORMAL)
            self.stop_import_btn.config(state=tk.DISABLED)
            return
        
        # Convert enum names to folder names (e.g., BAREKET -> Bareket)
        # The folder names are the same as enum names but with proper casing
        from il_supermarket_scarper.scrappers_factory import ScraperFactory
        folder_names = []
        for store in selected_stores:
            try:
                scraper = ScraperFactory.get(store)
                # Get an instance to extract the folder name
                instance = scraper()
                chain_name = instance.get_chain_name()
                # Convert to string if it's an enum or object
                if hasattr(chain_name, 'value'):
                    folder_names.append(str(chain_name.value))
                else:
                    folder_names.append(str(chain_name))
            except:
                # Fallback: use the enum name directly
                folder_names.append(store)
        
        self.log(f"📦 Démarrage de l'import: {', '.join(types)}", "#007acc")
        if len(selected_stores) < len(self.import_store_vars):
            self.log(f"📝 Magasins sélectionnés: {len(selected_stores)}/{len(self.import_store_vars)}", "#cccccc")
        
        def run_import():
            try:
                # Build single command with all types
                cmd = f"python import_xml_to_db.py {' '.join(types)}"
                
                # Add store filter if not all selected
                if len(selected_stores) < len(self.import_store_vars):
                    stores_str = ",".join(folder_names)
                    cmd += f' --stores "{stores_str}"'
                
                # Use 4 workers for good performance without overloading
                cmd += ' --workers 4'
                
                self.log(f"📝 Commande: {cmd}", "#cccccc")
                
                self.import_progress_label.config(text=f"🔄 Import en cours...")
                
                start_time = time.time()
                    
                self.import_process = subprocess.Popen(cmd,
                                         shell=True,
                                         stdout=subprocess.PIPE,
                                         stderr=subprocess.STDOUT,
                                         text=True,
                                         cwd=os.path.dirname(__file__))
                
                for line in self.import_process.stdout:
                    if self.stop_import_flag:
                        self.import_process.terminate()
                        self.log("⏹️ Import arrêté par l'utilisateur", "#007acc")
                        self.import_progress_label.config(text="⏹️ Import arrêté")
                        break
                    line = line.strip()
                    if line:
                        # Only log important lines to avoid slowdown
                        # Skip "Processing X/Y items..." lines for better performance
                        if not ("Processing " in line and " items..." in line):
                            self.log(line)
                        
                        # Parse progress
                        if "File:" in line and "/" in line:
                            try:
                                parts = line.split("File:")[1].split("|")[0].strip()
                                current, total = parts.split("/")
                                current = int(current.strip())
                                total = int(total.strip())
                                
                                progress = (current / total) * 100
                                self.import_progress_bar["value"] = progress
                                
                                # Update time
                                elapsed = time.time() - start_time
                                if current > 0:
                                    avg_time = elapsed / current
                                    remaining = avg_time * (total - current)
                                    
                                    elapsed_str = self.format_time(elapsed)
                                    remaining_str = self.format_time(remaining)
                                    
                                    self.import_time_label.config(
                                        text=f"⏱️ {current}/{total} ({progress:.1f}%) | "
                                             f"Écoulé: {elapsed_str} | Restant: ~{remaining_str}"
                                    )
                            except:
                                pass
                                
                if not self.stop_import_flag:
                    self.import_process.wait()
                    
                    if self.import_process.returncode != 0:
                        raise Exception(f"Erreur lors de l'import")
                        
                    self.import_progress_bar["value"] = 100
                    self.import_progress_label.config(text="✅ Import terminé avec succès!")
                    self.log("✅ Import terminé!", "#4ec9b0")
                
            except Exception as e:
                self.import_progress_label.config(text="❌ Erreur lors de l'import")
                self.log(f"❌ Erreur: {e}", "#f48771")
            finally:
                self.import_process = None
                self.start_import_btn.config(state=tk.NORMAL)
                self.stop_import_btn.config(state=tk.DISABLED)
                
        self.import_thread = threading.Thread(target=run_import, daemon=True)
        self.import_thread.start()
    
    def stop_scraping(self):
        """Arrête le scraping en cours"""
        if self.scraping_process:
            response = messagebox.askyesno(
                "Confirmer l'arrêt",
                "Voulez-vous vraiment arrêter le scraping en cours?"
            )
            if response:
                self.log("⏹️ Arrêt du scraping demandé...", "#ce9178")
                self.stop_scraping_flag = True
                try:
                    self.scraping_process.terminate()
                except:
                    pass
        else:
            messagebox.showinfo("Information", "Aucun scraping en cours")
    
    def stop_import(self):
        """Arrête l'import en cours"""
        if self.import_process:
            response = messagebox.askyesno(
                "Confirmer l'arrêt",
                "Voulez-vous vraiment arrêter l'import en cours?\n\n"
                "Note: Les données déjà importées seront conservées."
            )
            if response:
                self.log("⏹️ Arrêt de l'import demandé...", "#007acc")
                self.stop_import_flag = True
                try:
                    self.import_process.terminate()
                except:
                    pass
        else:
            messagebox.showinfo("Information", "Aucun import en cours")
    
    def open_product_search(self):
        """Ouvre la fenêtre de recherche de produits"""
        search_window = tk.Toplevel(self.root)
        search_window.title("🔍 Recherche de Produits")
        search_window.geometry("1000x700")
        search_window.configure(bg="#1e1e1e")
        
        # Frame principal
        main_frame = tk.Frame(search_window, bg="#1e1e1e", padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Titre
        title_label = tk.Label(main_frame,
                              text="Recherche de Produits",
                              bg="#1e1e1e",
                              fg="#007acc",
                              font=("Segoe UI", 16, "bold"))
        title_label.pack(pady=(0, 20))
        
        # Frame de recherche
        search_frame = tk.Frame(main_frame, bg="#2d2d30", padx=15, pady=15)
        search_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(search_frame,
                text="Nom du produit:",
                bg="#2d2d30",
                fg="#ffffff",
                font=("Segoe UI", 10)).pack(anchor=tk.W, pady=(0, 5))
        
        # Entry et bouton sur la même ligne
        entry_frame = tk.Frame(search_frame, bg="#2d2d30")
        entry_frame.pack(fill=tk.X)
        
        search_var = tk.StringVar()
        search_entry = tk.Entry(entry_frame,
                               textvariable=search_var,
                               font=("Segoe UI", 11),
                               bg="#3e3e42",
                               fg="#ffffff",
                               insertbackground="#ffffff",
                               relief=tk.FLAT,
                               width=50)
        search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10), ipady=5)
        
        search_btn = tk.Button(entry_frame,
                              text="🔍 Chercher",
                              command=lambda: self.search_products(search_var.get(), results_listbox, price_frame),
                              bg="#007acc",
                              fg="white",
                              font=("Segoe UI", 10, "bold"),
                              relief=tk.FLAT,
                              padx=20,
                              pady=8,
                              cursor="hand2")
        search_btn.pack(side=tk.LEFT)
        
        # Bind Enter key
        search_entry.bind('<Return>', lambda e: self.search_products(search_var.get(), results_listbox, price_frame))
        search_entry.focus()
        
        # Frame résultats
        results_frame = tk.Frame(main_frame, bg="#2d2d30", padx=15, pady=15)
        results_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        tk.Label(results_frame,
                text="Résultats (max 5 produits):",
                bg="#2d2d30",
                fg="#ffffff",
                font=("Segoe UI", 10, "bold")).pack(anchor=tk.W, pady=(0, 5))
        
        # Listbox avec scrollbar
        listbox_frame = tk.Frame(results_frame, bg="#2d2d30")
        listbox_frame.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = tk.Scrollbar(listbox_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        results_listbox = tk.Listbox(listbox_frame,
                                     yscrollcommand=scrollbar.set,
                                     font=("Segoe UI", 10),
                                     bg="#3e3e42",
                                     fg="#ffffff",
                                     selectbackground="#007acc",
                                     selectforeground="#ffffff",
                                     relief=tk.FLAT,
                                     height=5)
        results_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=results_listbox.yview)
        
        # Frame pour afficher les prix
        price_frame = tk.Frame(main_frame, bg="#2d2d30", padx=15, pady=15)
        price_frame.pack(fill=tk.BOTH, expand=True)
        
        tk.Label(price_frame,
                text="Prix par magasin:",
                bg="#2d2d30",
                fg="#ffffff",
                font=("Segoe UI", 10, "bold")).pack(anchor=tk.W, pady=(0, 10))
        
        # Text widget pour afficher les prix avec scrollbar
        price_text_frame = tk.Frame(price_frame, bg="#2d2d30")
        price_text_frame.pack(fill=tk.BOTH, expand=True)
        
        price_scrollbar = tk.Scrollbar(price_text_frame)
        price_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        price_text = scrolledtext.ScrolledText(price_text_frame,
                                               font=("Consolas", 9),
                                               bg="#3e3e42",
                                               fg="#ffffff",
                                               relief=tk.FLAT,
                                               wrap=tk.WORD,
                                               state=tk.DISABLED)
        price_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Bind selection
        results_listbox.bind('<<ListboxSelect>>', 
                           lambda e: self.on_product_select(results_listbox, price_text))
        
        # Stockage des résultats
        search_window.product_data = {}
    
    def search_products(self, query, listbox, price_frame):
        """Recherche des produits dans la base de données"""
        if not query or len(query.strip()) < 2:
            messagebox.showwarning("Attention", "Veuillez entrer au moins 2 caractères")
            return
        
        # Clear previous results
        listbox.delete(0, tk.END)
        
        # Run async search
        def run_search():
            try:
                from prisma import Prisma
                
                async def search():
                    db = Prisma()
                    await db.connect()
                    
                    try:
                        # Split query into words for flexible search
                        words = query.strip().split()
                        
                        if len(words) == 1:
                            # Single word search
                            search_conditions = {
                                'OR': [
                                    {'itemName': {'contains': query, 'mode': 'insensitive'}},
                                    {'manufacturerName': {'contains': query, 'mode': 'insensitive'}},
                                    {'manufacturerItemDescription': {'contains': query, 'mode': 'insensitive'}}
                                ]
                            }
                        else:
                            # Multi-word search - each word can appear anywhere in any order
                            word_conditions = []
                            for word in words:
                                word_conditions.append({
                                    'OR': [
                                        {'itemName': {'contains': word, 'mode': 'insensitive'}},
                                        {'manufacturerName': {'contains': word, 'mode': 'insensitive'}},
                                        {'manufacturerItemDescription': {'contains': word, 'mode': 'insensitive'}}
                                    ]
                                })
                            
                            # All words must be found (AND), but can be in any field
                            search_conditions = {'AND': word_conditions}
                        
                        # Search products
                        products = await db.product.find_many(
                            where=search_conditions,
                            take=5,
                            order={'itemName': 'asc'}
                        )
                        
                        return products
                    finally:
                        await db.disconnect()
                
                # Run async function
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                products = loop.run_until_complete(search())
                loop.close()
                
                # Update UI in main thread
                if products:
                    for product in products:
                        display_text = f"{product.itemName} ({product.itemCode})"
                        listbox.insert(tk.END, display_text)
                        # Store product data
                        listbox.master.master.master.master.product_data[display_text] = product
                    
                    self.log(f"✅ Trouvé {len(products)} produit(s) pour '{query}'", "#4ec9b0")
                else:
                    listbox.insert(tk.END, "Aucun produit trouvé")
                    self.log(f"❌ Aucun produit trouvé pour '{query}'", "#f48771")
                    
            except Exception as e:
                self.log(f"❌ Erreur recherche: {str(e)}", "#f48771")
                messagebox.showerror("Erreur", f"Erreur lors de la recherche:\n{str(e)}")
        
        # Run in thread
        threading.Thread(target=run_search, daemon=True).start()
    
    def on_product_select(self, listbox, price_text):
        """Affiche les prix quand un produit est sélectionné"""
        selection = listbox.curselection()
        if not selection:
            return
        
        selected_text = listbox.get(selection[0])
        if selected_text == "Aucun produit trouvé":
            return
        
        # Get product data
        product_data = listbox.master.master.master.master.product_data.get(selected_text)
        if not product_data:
            return
        
        item_code = product_data.itemCode
        
        # Show loading
        price_text.config(state=tk.NORMAL)
        price_text.delete(1.0, tk.END)
        price_text.insert(tk.END, "Chargement des prix...\n")
        price_text.config(state=tk.DISABLED)
        
        def load_prices():
            try:
                from prisma import Prisma
                from datetime import datetime
                
                async def get_prices():
                    db = Prisma()
                    await db.connect()
                    
                    try:
                        # Get all prices for this product
                        prices = await db.price.find_many(
                            where={'itemCode': item_code},
                            include={'store': True},
                            order={'itemPrice': 'asc'}
                        )
                        
                        # Get promotions for this product
                        promo_items = await db.promotionitem.find_many(
                            where={'itemCode': item_code},
                            include={
                                'promotion': {
                                    'include': {'store': True}
                                }
                            }
                        )
                        
                        return prices, promo_items
                    finally:
                        await db.disconnect()
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                prices, promo_items = loop.run_until_complete(get_prices())
                loop.close()
                
                # Build display text
                output = []
                output.append(f"{'='*80}\n")
                output.append(f"PRODUIT: {product_data.itemName}\n")
                output.append(f"CODE BARRE: {product_data.itemCode}\n")
                if product_data.manufacturerName:
                    output.append(f"FABRICANT: {product_data.manufacturerName}\n")
                output.append(f"{'='*80}\n\n")
                
                if prices:
                    output.append(f"📊 PRIX PAR MAGASIN ({len(prices)} magasin(s)):\n")
                    output.append(f"{'-'*80}\n")
                    
                    # Group by store
                    stores_prices = {}
                    for price in prices:
                        store_key = f"{price.store.chainName or 'Inconnu'} - {price.store.storeName or 'Magasin'} (ID: {price.storeId})"
                        if store_key not in stores_prices:
                            stores_prices[store_key] = []
                        stores_prices[store_key].append(price)
                    
                    for store_name, store_prices in sorted(stores_prices.items()):
                        output.append(f"\n🏪 {store_name}\n")
                        for price in store_prices:
                            price_val = float(price.itemPrice) if price.itemPrice else 0
                            output.append(f"   💰 Prix: {price_val:.2f} ₪")
                            if price.unitOfMeasurePrice:
                                output.append(f" (Prix/unité: {price.unitOfMeasurePrice})")
                            if price.priceUpdateDate:
                                update_date = price.priceUpdateDate.strftime("%d/%m/%Y")
                                output.append(f" - MAJ: {update_date}")
                            output.append("\n")
                else:
                    output.append("\n❌ Aucun prix trouvé pour ce produit\n")
                
                # Display promotions
                if promo_items:
                    output.append(f"\n{'='*80}\n")
                    output.append(f"🎉 PROMOTIONS ACTIVES ({len(promo_items)} promo(s)):\n")
                    output.append(f"{'-'*80}\n")
                    
                    today = datetime.now().date()
                    for promo_item in promo_items:
                        promo = promo_item.promotion
                        start = promo.promotionStartDate.date() if promo.promotionStartDate else None
                        end = promo.promotionEndDate.date() if promo.promotionEndDate else None
                        
                        # Check if active
                        is_active = True
                        if start and end:
                            is_active = start <= today <= end
                        
                        status = "✅ ACTIVE" if is_active else "⏸️ INACTIVE"
                        
                        output.append(f"\n{status} - {promo.store.chainName or 'Inconnu'} - {promo.store.storeName or 'Magasin'}\n")
                        if promo.promotionDescription:
                            output.append(f"   📝 {promo.promotionDescription}\n")
                        if start and end:
                            output.append(f"   📅 Du {start.strftime('%d/%m/%Y')} au {end.strftime('%d/%m/%Y')}\n")
                        if promo.discountedPrice:
                            output.append(f"   💸 Prix promotionnel: {promo.discountedPrice} ₪\n")
                        if promo.rewardType:
                            output.append(f"   🎁 Type: {promo.rewardType}\n")
                
                # Update UI
                price_text.config(state=tk.NORMAL)
                price_text.delete(1.0, tk.END)
                price_text.insert(tk.END, ''.join(output))
                price_text.config(state=tk.DISABLED)
                
                self.log(f"✅ Prix chargés pour {product_data.itemName}", "#4ec9b0")
                
            except Exception as e:
                price_text.config(state=tk.NORMAL)
                price_text.delete(1.0, tk.END)
                price_text.insert(tk.END, f"❌ Erreur lors du chargement des prix:\n{str(e)}")
                price_text.config(state=tk.DISABLED)
                self.log(f"❌ Erreur chargement prix: {str(e)}", "#f48771")
        
        threading.Thread(target=load_prices, daemon=True).start()
        
    def format_time(self, seconds):
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            mins = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{mins}m {secs}s"
        else:
            hours = int(seconds // 3600)
            mins = int((seconds % 3600) // 60)
            return f"{hours}h {mins}m"

def main():
    root = tk.Tk()
    app = AgaliManagerGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
