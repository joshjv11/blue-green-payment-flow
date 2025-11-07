import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit, Plus, Save, X, Tag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExpenseCategory {
  id: string;
  category_name: string;
  category_icon: string;
  monthly_budget: number;
  auto_detect_keywords: string[];
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

const EMOJI_OPTIONS = [
  '🍽️', '🚆', '🛒', '📱', '🎬', '👕', '💊', '🏠', '📚', '💰',
  '🚗', '✈️', '🏥', '🎓', '🍕', '☕', '🍔', '🎮', '🎵', '📺',
  '💳', '🏦', '💼', '🎁', '🏋️', '🧘', '🎨', '📷', '📖', '🔧'
];

export function CategoryManagement() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({
    category_name: '',
    category_icon: '💰',
    monthly_budget: '',
    keywords: [] as string[],
  });
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    // Table doesn't exist yet - disable for now
    setLoading(false);
    setCategories([]);
  }, []);

  const handleSaveCategory = async (category: ExpenseCategory) => {
    toast({
      title: 'Feature Not Available',
      description: 'Expense categories feature is under development',
      variant: 'destructive',
    });
  };

  const handleAddCategory = async () => {
    toast({
      title: 'Feature Not Available',
      description: 'Expense categories feature is under development',
      variant: 'destructive',
    });
  };

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    toast({
      title: 'Feature Not Available',
      description: 'Expense categories feature is under development',
      variant: 'destructive',
    });
  };

  const handleToggleActive = async (category: ExpenseCategory) => {
    toast({
      title: 'Feature Not Available',
      description: 'Expense categories feature is under development',
      variant: 'destructive',
    });
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !newCategory.keywords.includes(newKeyword.toLowerCase())) {
      setNewCategory({
        ...newCategory,
        keywords: [...newCategory.keywords, newKeyword.toLowerCase()],
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setNewCategory({
      ...newCategory,
      keywords: newCategory.keywords.filter(k => k !== keyword),
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Loading categories...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Manage Categories
              </CardTitle>
              <CardDescription>
                Customize expense categories and auto-detection keywords
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Create a custom expense category with auto-detection keywords
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      value={newCategory.category_name}
                      onChange={(e) => setNewCategory({ ...newCategory, category_name: e.target.value })}
                      placeholder="e.g., Coffee & Beverages"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <div className="flex flex-wrap gap-2">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewCategory({ ...newCategory, category_icon: emoji })}
                          className={`text-2xl p-2 rounded border-2 transition-colors ${
                            newCategory.category_icon === emoji
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly-budget">Monthly Budget (₹) - Optional</Label>
                    <Input
                      id="monthly-budget"
                      type="number"
                      value={newCategory.monthly_budget}
                      onChange={(e) => setNewCategory({ ...newCategory, monthly_budget: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-Detect Keywords</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addKeyword();
                          }
                        }}
                        placeholder="e.g., starbucks, cafe"
                      />
                      <Button type="button" onClick={addKeyword} variant="outline">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newCategory.keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="gap-1">
                          {keyword}
                          <button
                            type="button"
                            onClick={() => removeKeyword(keyword)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add keywords that should automatically categorize expenses to this category
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCategory}>
                    <Save className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => (
              <Card key={category.id} className={!category.is_active ? 'opacity-50' : ''}>
                <CardContent className="pt-6">
                  {editingCategory?.id === category.id ? (
                    <EditCategoryForm
                      category={editingCategory}
                      onSave={handleSaveCategory}
                      onCancel={() => setEditingCategory(null)}
                      emojiOptions={EMOJI_OPTIONS}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.category_icon}</span>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {category.category_name}
                            {category.is_default && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                            {!category.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {category.monthly_budget > 0 && (
                              <span>Budget: ₹{category.monthly_budget.toLocaleString('en-IN')}/month</span>
                            )}
                            {category.auto_detect_keywords.length > 0 && (
                              <span className="ml-2">
                                Keywords: {category.auto_detect_keywords.slice(0, 3).join(', ')}
                                {category.auto_detect_keywords.length > 3 && '...'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(category)}
                        >
                          {category.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!category.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface EditCategoryFormProps {
  category: ExpenseCategory;
  onSave: (category: ExpenseCategory) => void;
  onCancel: () => void;
  emojiOptions: string[];
}

function EditCategoryForm({ category, onSave, onCancel, emojiOptions }: EditCategoryFormProps) {
  const [editedCategory, setEditedCategory] = useState(category);
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    if (newKeyword.trim() && !editedCategory.auto_detect_keywords.includes(newKeyword.toLowerCase())) {
      setEditedCategory({
        ...editedCategory,
        auto_detect_keywords: [...editedCategory.auto_detect_keywords, newKeyword.toLowerCase()],
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setEditedCategory({
      ...editedCategory,
      auto_detect_keywords: editedCategory.auto_detect_keywords.filter(k => k !== keyword),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Category Name</Label>
        <Input
          value={editedCategory.category_name}
          onChange={(e) => setEditedCategory({ ...editedCategory, category_name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-2">
          {emojiOptions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setEditedCategory({ ...editedCategory, category_icon: emoji })}
              className={`text-2xl p-2 rounded border-2 transition-colors ${
                editedCategory.category_icon === emoji
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Monthly Budget (₹)</Label>
        <Input
          type="number"
          value={editedCategory.monthly_budget}
          onChange={(e) => setEditedCategory({ ...editedCategory, monthly_budget: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-2">
        <Label>Auto-Detect Keywords</Label>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder="Add keyword"
          />
          <Button type="button" onClick={addKeyword} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {editedCategory.auto_detect_keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="gap-1">
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(keyword)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(editedCategory)}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
